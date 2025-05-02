import apiClient, { setAuthToken } from './apiClient';
import {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  PasswordResetRequest,
  PasswordResetResponse,
  UserProfile,
} from '../types/api.types';

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // Use the correct login endpoint
      const response = await apiClient.post('/login', credentials);

      if (response.data) {
        const token = response.data.token || `mock-token-${response.data.id}`;
        setAuthToken(token);
        return {
          token,
          user: {
            id: response.data.id,
            email: response.data.email,
            is_premium: response.data.is_premium || false,
          },
        };
      }
      throw new Error('Invalid response from server');
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Fallback to users endpoint if auth/login is not found
        const users = await apiClient.get('/users', { params: credentials });
        if (users.data && users.data.length > 0) {
          const user = users.data[0];
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
        }
      }
      throw new Error('Login failed: Invalid credentials');
    }
  }

  async signup(credentials: SignupRequest): Promise<SignupResponse> {
    // Mock signup: POST request to /users
    const response = await apiClient.post('/users', credentials);
    // Assuming JSON Server returns the created user data on success
    // For mock, we can return a simple success message
    return { message: 'Signup successful' };
  }

  async resetPassword(email: string): Promise<PasswordResetResponse> {
    // Mock password reset: This endpoint doesn't have a direct equivalent in default JSON Server
    // We can simulate a successful response for the mock
    console.log(`Mock password reset requested for email: ${email}`);
    return { message: 'Password reset instructions sent (mock)' };
  }

  // Assuming verify account is still needed and uses a token
  async verifyAccount(token: string): Promise<any> {
    // Define a proper type for verify account response
    // This endpoint doesn't have a direct equivalent in default JSON Server
    console.log(`Mock account verification with token: ${token}`);
    return { message: 'Account verified (mock)' };
  }

  logout(): void {
    setAuthToken(null);
    // Also remove refresh token if implemented
    // setRefreshToken(null);
  }
}

export default new AuthService();
