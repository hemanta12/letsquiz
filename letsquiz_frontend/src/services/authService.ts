import apiClient, { setAuthToken } from './apiClient';
import {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  PasswordResetRequest,
  PasswordResetResponse,
  SetNewPasswordResponse,
  UserProfile,
} from '../types/api.types';
import { v4 as uuidv4 } from 'uuid';
import { AES, enc } from 'crypto-js';

const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const REFRESH_TOKEN_LIFETIME = 24 * 60 * 60 * 1000; // 1 day in milliseconds
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'default-key';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiration

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
    is_premium: boolean;
  };
}

interface RefreshResponseData {
  access: string;
  refresh: string;
}

class AuthService {
  private sessionCheckInterval: NodeJS.Timeout | null = null;

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
      if (!session) return;

      const timeUntilExpiry = session.expiresAt - Date.now();

      if (timeUntilExpiry <= 0) {
        this.logout();
        window.dispatchEvent(new CustomEvent('sessionExpired'));
        return;
      }

      if (timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD) {
        console.log('[Session] Token approaching expiration, attempting refresh');
        const refreshSuccess = await this.refreshSession();

        if (!refreshSuccess) {
          console.error('[Session] Failed to refresh token');
          this.logout();
          window.dispatchEvent(new CustomEvent('sessionExpired'));
        } else {
          console.log('[Session] Token refreshed successfully');
        }
      }
    } catch (error) {
      console.error('[Session] Error during session check:', error);
      this.logout();
      window.dispatchEvent(new CustomEvent('sessionExpired'));
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
    console.log('[Guest Session] Creating new guest session');

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

  private securelyStoreGuestData(key: string, data: any): void {
    const encrypted = AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
    localStorage.setItem(key, encrypted);
  }

  private securelyRetrieveGuestData(key: string): any {
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
      console.log('[Auth] Login request:', credentials);

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
            is_premium: user.is_premium,
          },
        };
      } else {
        // Handle non-200 status codes with response data
        const backendError = response.data as any;
        const errorMessage =
          backendError?.detail || backendError?.message || JSON.stringify(backendError);
        throw {
          message: errorMessage,
          code: backendError?.code || 'auth_error',
          status: response.status,
        };
      }
    } catch (error: any) {
      if (error.code != null && error.status != null) {
        throw error;
      }

      console.error('[Auth] Login error:', error);
      console.log('[Auth] Backend error response data:', error.response?.data);

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

      throw {
        message: errorMessage,
        code: errorCode,
        status: statusCode,
      };
    }
  }

  async signup(credentials: SignupRequest): Promise<SignupResponse> {
    try {
      const response = await apiClient.post<SignupResponse>('/auth/signup/', credentials);
      return response.data;
    } catch (error: any) {
      console.error('[Auth] Signup error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      const errorResponse = error.response?.data;
      if (errorResponse?.error && errorResponse?.code) {
        throw {
          message: errorResponse.error,
          code: errorResponse.code,
          status: error.response?.status,
        };
      }
      throw {
        message: error.message || 'An unexpected error occurred',
        code: 'system_error',
        status: error.response?.status || 500,
      };
    }
  }

  async resetPassword(email: string): Promise<PasswordResetResponse> {
    try {
      const response = await apiClient.post<PasswordResetResponse>('/auth/password-reset/', {
        email,
      });

      if (!response.data) {
        throw new Error('No response data received from server');
      }

      return response.data;
    } catch (error: any) {
      const errorResponse = {
        message: 'An unexpected error occurred',
        code: 'system_error',
        status: error.response?.status || 500,
      };

      if (error.response?.data?.error && error.response?.data?.code) {
        errorResponse.message = error.response.data.error;
        errorResponse.code = error.response.data.code;
        errorResponse.status = error.response.status;
      } else if (error.message) {
        errorResponse.message = error.message;
        errorResponse.code = 'api_response_error';
        errorResponse.status = 500;
      }

      throw errorResponse;
    }
  }

  async setNewPassword(token: string, password: string): Promise<SetNewPasswordResponse> {
    try {
      const response = await apiClient.post<SetNewPasswordResponse>('/auth/set-new-password/', {
        token,
        password,
      });

      if (!response.data) {
        throw new Error('No response data received from server');
      }

      return response.data;
    } catch (error: any) {
      const errorResponse = {
        message: 'An unexpected error occurred',
        code: 'system_error',
        status: error.response?.status || 500,
      };

      if (error.response?.data?.error && error.response?.data?.code) {
        errorResponse.message = error.response.data.error;
        errorResponse.code = error.response.data.code;
        errorResponse.status = error.response.status;
      } else if (error.message) {
        errorResponse.message = error.message;
        errorResponse.code = 'api_response_error';
        errorResponse.status = 500;
      }

      throw errorResponse;
    }
  }

  async refreshSession(): Promise<boolean> {
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
      return true;
    } catch (error: any) {
      console.error('Token refresh failed:', error);

      if (error.response?.status === 401) {
        console.log('Refresh token is invalid or expired');
        this.logout();
        window.dispatchEvent(new CustomEvent('sessionExpired'));
      } else {
        console.error('Unexpected error during token refresh:', error);
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
  }

  isGuestSession(): boolean {
    const guestUser = this.securelyRetrieveGuestData('guestUser');
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

const authService = new AuthService();
export default authService;

export function getSessionData(): SessionData | null {
  return authService.getSessionData();
}

export function getAuthToken(): string | null {
  const session = getSessionData();
  return session?.token ?? null;
}
