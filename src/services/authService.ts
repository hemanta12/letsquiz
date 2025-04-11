import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends LoginCredentials {
  confirmPassword: string;
}

class AuthService {
  async login(credentials: LoginCredentials) {
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  }

  async signup(credentials: SignUpCredentials) {
    const response = await axios.post(`${API_URL}/auth/signup`, credentials);
    return response.data;
  }

  async resetPassword(email: string) {
    const response = await axios.post(`${API_URL}/auth/reset-password`, { email });
    return response.data;
  }

  async verifyAccount(token: string) {
    const response = await axios.post(`${API_URL}/auth/verify`, { token });
    return response.data;
  }

  logout() {
    localStorage.removeItem('token');
  }
}

export default new AuthService();
