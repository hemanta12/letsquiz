import apiClient, { setAuthToken } from './apiClient';
import { LoginRequest, LoginResponse, SignupRequest, SignupResponse } from '../types/api.types';
import { v4 as uuidv4 } from 'uuid';
import { AES, enc } from 'crypto-js';

const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const REFRESH_TOKEN_LIFETIME = 24 * 60 * 60 * 1000 * 7; // 7 days in milliseconds
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'default-key';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiration

export const setRefreshToken = (token: string | null): void => {
  if (token) {
    const encrypted = AES.encrypt(token, ENCRYPTION_KEY).toString();
    localStorage.setItem('refreshToken', encrypted);

    const refreshTokenData = {
      token: token,
      expiresAt: Date.now() + REFRESH_TOKEN_LIFETIME,
    };
    localStorage.setItem('refreshTokenData', JSON.stringify(refreshTokenData));
  } else {
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refreshTokenData');
  }
};

export const getRefreshToken = (): string | null => {
  const encrypted = localStorage.getItem('refreshToken');
  if (!encrypted) return null;

  try {
    return AES.decrypt(encrypted, ENCRYPTION_KEY).toString(enc.Utf8);
  } catch {
    return null;
  }
};

interface GuestUser {
  id: string;
  isGuest: true;
  createdAt: string;
  expiresAt: string;
}

interface GuestSession {
  user: GuestUser;
  featureGates: {
    canAccessPremiumContent: boolean;
    maxQuestionsPerQuiz: number;
    canSaveProgress: boolean;
  };
}

interface SessionData {
  token: string;
  expiresAt: number;
}

interface LoginResponseData {
  access: string;
  refresh: string;
  user: {
    id: number;
    email: string;
    username: string;
    is_premium: boolean;
  };
}

interface RefreshResponseData {
  access: string;
  refresh: string;
}

class CustomAuthError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'CustomAuthError';
    this.code = code;
    this.status = status;
  }
}

class AuthService {
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private logoutInProgress = false;

  constructor() {
    this.initializeSessionCheck();
  }

  private initializeSessionCheck() {
    this.sessionCheckInterval = setInterval(async () => {
      await this.checkSessionStatus();
    }, 60 * 1000);
  }

  private async checkSessionStatus() {
    try {
      const session = this.getSessionData();
      if (!session) {
        return;
      }

      const timeUntilExpiry = session.expiresAt - Date.now();

      if (timeUntilExpiry <= 0) {
        this.logout();
        window.dispatchEvent(
          new CustomEvent('sessionExpired', {
            detail: { reason: 'token_expired' },
          })
        );
        return;
      }

      if (timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD) {
        const refreshSuccess = await this.refreshSession();

        if (!refreshSuccess) {
          this.logout();
          window.dispatchEvent(
            new CustomEvent('sessionExpired', {
              detail: { reason: 'refresh_failed' },
            })
          );
        } else {
          window.dispatchEvent(new CustomEvent('tokenRefreshed'));
        }
      }
    } catch (error) {
      this.logout();
      window.dispatchEvent(
        new CustomEvent('sessionExpired', {
          detail: { reason: 'session_check_error', error },
        })
      );
    }
  }

  private setSessionData(data: SessionData): void {
    const encrypted = AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
    localStorage.setItem('sessionData', encrypted);
  }

  public getSessionData(): SessionData | null {
    const encrypted = localStorage.getItem('sessionData');
    if (!encrypted) return null;

    try {
      const decrypted = AES.decrypt(encrypted, ENCRYPTION_KEY).toString(enc.Utf8);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  createGuestSession(): GuestSession {
    const guestUser: GuestUser = {
      id: uuidv4(),
      isGuest: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_DURATION).toISOString(),
    };

    const session: GuestSession = {
      user: guestUser,
      featureGates: this.getGuestFeatureGates(),
    };

    this.securelyStoreGuestData('guestUser', guestUser);
    return session;
  }

  getGuestFeatureGates(): GuestSession['featureGates'] {
    return {
      canAccessPremiumContent: false,
      maxQuestionsPerQuiz: 3,
      canSaveProgress: false,
    };
  }

  private securelyStoreGuestData(key: string, data: unknown): void {
    const encrypted = AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
    localStorage.setItem(key, encrypted);
  }

  private securelyRetrieveGuestData(key: string): unknown {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;

    try {
      const decrypted = AES.decrypt(encrypted, ENCRYPTION_KEY).toString(enc.Utf8);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponseData>('/auth/login/', {
        email: credentials.email,
        password: credentials.password,
      });

      if (response.status === 200) {
        if (!response.data) {
          throw new Error('No response data received from server');
        }

        const { access, refresh, user } = response.data;

        // Validate all required fields are present
        if (!access || !refresh) {
          throw new Error('Missing authentication tokens in response');
        }
        if (!user || typeof user.id === 'undefined' || !user.email) {
          throw new Error('Invalid or incomplete user data received from server');
        }

        this.setSessionData({
          token: access,
          expiresAt: Date.now() + SESSION_DURATION,
        });

        setAuthToken(access);
        setRefreshToken(refresh);

        return {
          access,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            is_premium: user.is_premium,
          },
        };
      } else {
        // Handle non-200 status codes with response data
        const backendError = response.data as any;
        const errorMessage =
          backendError?.detail || backendError?.message || JSON.stringify(backendError);
        throw new CustomAuthError(
          errorMessage,
          backendError?.code || 'auth_error',
          response.status
        );
      }
    } catch (error: any) {
      if (error instanceof CustomAuthError) {
        throw error;
      }
      if (error.code != null && error.status != null) {
        throw new CustomAuthError(error.message, error.code, error.status);
      }

      // Legacy fallback formatting
      let errorMessage = 'An unexpected error occurred';
      let statusCode = 500;
      let errorCode = 'system_error';

      if (error.response && error.response.data) {
        const backendError = error.response.data as any;
        if (typeof backendError === 'string') {
          errorMessage = backendError;
        } else {
          errorMessage =
            backendError?.detail || backendError?.message || JSON.stringify(backendError);
        }
        statusCode = error.response.status;
        errorCode = backendError.code || 'auth_error';
      } else if (error.message) {
        errorMessage = error.message;
        errorCode = 'api_response_error';
      }

      throw new CustomAuthError(errorMessage, errorCode, statusCode);
    }
  }

  private handleAuthError(error: any) {
    const errorResponse = {
      message: 'An unexpected error occurred',
      code: 'system_error',
      status: error.response?.status || 500,
    };

    if (error.response?.data) {
      const errorData = error.response.data;
      if (errorData.email) {
        errorResponse.message = Array.isArray(errorData.email)
          ? errorData.email[0]
          : errorData.email;
        errorResponse.code = 'invalid_email';
      } else if (errorData.password) {
        errorResponse.message = Array.isArray(errorData.password)
          ? errorData.password[0]
          : errorData.password;
        errorResponse.code = 'invalid_password';
      } else if (errorData.detail) {
        errorResponse.message = errorData.detail;
        errorResponse.code = errorData.code || 'auth_error';
      }
      errorResponse.status = error.response.status;
    } else if (error.message) {
      errorResponse.message = error.message;
      errorResponse.code = 'api_response_error';
    }

    return errorResponse;
  }

  async signup(credentials: SignupRequest): Promise<SignupResponse> {
    try {
      const response = await apiClient.post<SignupResponse>('/auth/signup/', credentials);
      if (!response.data) {
        throw new Error('No response data received from server');
      }
      return response.data;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async refreshSession(): Promise<boolean> {
    if (this.logoutInProgress) return false;

    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    const session = this.getSessionData();
    if (!session) return false;

    const refreshTokenData = this.getRefreshTokenData();
    if (!refreshTokenData || Date.now() > refreshTokenData.expiresAt) {
      this.logout();
      return false;
    }

    try {
      const response = await apiClient.post<RefreshResponseData>('/auth/refresh/', {
        refresh: refreshToken,
      });

      const { access, refresh } = response.data;

      this.setSessionData({
        token: access,
        expiresAt: Date.now() + SESSION_DURATION,
      });

      setAuthToken(access);
      setRefreshToken(refresh);

      // Dispatch token refreshed event
      window.dispatchEvent(
        new CustomEvent('tokenRefreshed', {
          detail: { newToken: access },
        })
      );

      return true;
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.logout();
        window.dispatchEvent(new CustomEvent('sessionExpired'));
      }
      return false;
    }
  }

  private getRefreshTokenData(): { token: string; expiresAt: number } | null {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const data = localStorage.getItem('refreshTokenData');
      if (!data) {
        const refreshTokenData = {
          token: refreshToken,
          expiresAt: Date.now() + REFRESH_TOKEN_LIFETIME,
        };
        localStorage.setItem('refreshTokenData', JSON.stringify(refreshTokenData));
        return refreshTokenData;
      }

      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  logout(): void {
    this.logoutInProgress = true;
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    if (this.isGuestSession()) {
      const guestProgress = this.securelyRetrieveGuestData('guestProgress');
      const guestQuizzes = this.securelyRetrieveGuestData('guestQuizProgress');

      setAuthToken(null);
      setRefreshToken(null);
      localStorage.removeItem('sessionData');

      if (guestProgress) this.securelyStoreGuestData('guestProgress', guestProgress);
      if (guestQuizzes) this.securelyStoreGuestData('guestQuizProgress', guestQuizzes);
    } else {
      setAuthToken(null);
      setRefreshToken(null);
      localStorage.removeItem('sessionData');
      this.clearGuestSession();
    }
    this.logoutInProgress = false;
  }

  isGuestSession(): boolean {
    const guestUser = this.securelyRetrieveGuestData('guestUser') as GuestUser | null;
    if (!guestUser) return false;

    const expiresAt = new Date(guestUser.expiresAt).getTime();
    if (Date.now() > expiresAt) {
      this.clearGuestSession();
      return false;
    }

    return true;
  }

  clearGuestSession(): void {
    ['guestUser', 'guestProgress', 'guestQuizProgress', 'guestQuizCount'].forEach((key) => {
      localStorage.removeItem(key);
    });
  }
}

const authService = new AuthService();
export default authService;

export function getSessionData(): SessionData | null {
  return authService.getSessionData();
}

export function getAuthToken(): string | null {
  const session = getSessionData();
  return session?.token ?? null;
}
