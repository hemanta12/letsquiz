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
      const response = await apiClient.get('/users', { params: { email: credentials.email } });

      if (response.data && response.data.length > 0) {
        const user = response.data[0];

        if (user.password === credentials.password) {
          const token = `mock-token-${user.id}`;
          setAuthToken(token);
          return {
            token,
            user: {
              id: user.id,
              email: user.email,
              is_premium: user.is_premium || false,
            },
          };
        } else {
          throw new Error('Login failed: Invalid credentials');
        }
      } else {
        throw new Error('Login failed: User not found');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(`Login failed: ${error.message || 'An error occurred'}`);
    }
  }

  async signup(credentials: SignupRequest): Promise<SignupResponse> {
    try {
      const response = await apiClient.post('/users', credentials);
      return { message: 'Signup successful' };
    } catch (error: any) {
      throw new Error(`Signup failed: ${error.message || 'An error occurred'}`);
    }
  }

  async resetPassword(email: string): Promise<PasswordResetResponse> {
    try {
      // Mock password reset
      console.log(`Mock password reset requested for email: ${email}`);
      return { message: 'Password reset instructions sent (mock)' };
    } catch (error: any) {
      throw new Error(`Password reset failed: ${error.message || 'An error occurred'}`);
    }
  }

  async setNewPassword(token: string, password: string): Promise<SetNewPasswordResponse> {
    try {
      // Mock set new password
      console.log(`Mock set new password with token: ${token} and password: ${password}`);
      return { message: 'Password has been reset successfully (mock)' };
    } catch (error: any) {
      throw new Error(`Set new password failed: ${error.message || 'An error occurred'}`);
    }
  }

  async verifyAccount(token: string): Promise<any> {
    try {
      // Mock account verification
      console.log(`Mock account verification with token: ${token}`);
      return { message: 'Account verified (mock)' };
    } catch (error: any) {
      throw new Error(`Account verification failed: ${error.message || 'An error occurred'}`);
    }
  }

  logout(): void {
    setAuthToken(null);
  }
}

export default new AuthService();
