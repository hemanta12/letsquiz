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

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // Send email as 'username' to match backend serializer expectation
      const response = await apiClient.post('/auth/login/', {
        email: credentials.email,
        password: credentials.password,
      });
      const { access, refresh, user_id } = response.data;

      // Store tokens
      setAuthToken(access);
      setRefreshToken(refresh);

      // Return the response data including user_id
      return {
        token: access,
        user: {
          id: user_id,
          email: credentials.email, // Assuming email is part of credentials
          is_premium: false, // This might need to be fetched separately or included in the response
        },
      };
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(`Login failed: ${error.message || 'An error occurred'}`);
    }
  }

  async signup(credentials: SignupRequest): Promise<SignupResponse> {
    try {
      // Assuming the backend signup endpoint is '/auth/signup/'
      const response = await apiClient.post('/signup/', credentials);
      return { message: 'Signup successful' };
    } catch (error: any) {
      throw new Error(`Signup failed: ${error.message || 'An error occurred'}`);
    }
  }

  async resetPassword(email: string): Promise<PasswordResetResponse> {
    try {
      // Assuming the backend password reset request endpoint is '/auth/password-reset/'
      const response = await apiClient.post('/auth/password-reset/', { email });
      return { message: 'Password reset instructions sent.' };
    } catch (error: any) {
      throw new Error(`Password reset failed: ${error.message || 'An error occurred'}`);
    }
  }

  async setNewPassword(token: string, password: string): Promise<SetNewPasswordResponse> {
    try {
      // Assuming the backend set new password endpoint is '/auth/set-new-password/'
      const response = await apiClient.post('/auth/set-new-password/', { token, password });
      return { message: 'Password has been reset successfully.' };
    } catch (error: any) {
      throw new Error(`Set new password failed: ${error.message || 'An error occurred'}`);
    }
  }

  async verifyAccount(token: string): Promise<any> {
    try {
      // Assuming the backend account verification endpoint is '/auth/verify-account/'
      const response = await apiClient.post('/auth/verify-account/', { token });
      return { message: 'Account successfully activated.' };
    } catch (error: any) {
      throw new Error(`Account verification failed: ${error.message || 'An error occurred'}`);
    }
  }

  logout(): void {
    setAuthToken(null);
    setRefreshToken(null);
  }
}

// Helper functions to manage refresh token in localStorage
export const setRefreshToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem('refreshToken', token);
  } else {
    localStorage.removeItem('refreshToken');
  }
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

export default new AuthService();
