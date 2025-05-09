import axios, { AxiosResponse, AxiosError } from 'axios';
import { getRefreshToken, setRefreshToken } from './authService'; // Import token functions from authService

import {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  PasswordResetRequest,
  PasswordResetResponse,
  FetchQuestionsRequest,
  FetchQuestionsResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
} from '../types/api.types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Check for 401 error and if it's not a retry of the refresh request
    if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._isRetry) {
      (originalRequest as any)._isRetry = true; // Mark the original request as retried

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          // No refresh token available, cannot refresh
          return Promise.reject(error);
        }

        // Attempt to refresh the token
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        }); // Use '/auth/refresh/' with trailing slash

        const newAccessToken = refreshResponse.data.access; // Simple JWT returns 'access' and 'refresh'
        const newRefreshToken = refreshResponse.data.refresh;

        // Store the new tokens
        setAuthToken(newAccessToken);
        setRefreshToken(newRefreshToken);

        // Update the authorization header for the original request with the new access token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Retry the original request with the new token
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and log out
        setAuthToken(null);
        setRefreshToken(null);

        console.error('Unable to refresh token, logging out:', refreshError);
        // Redirect to login page or show an error message
        // You might want to dispatch a logout action here
        return Promise.reject(refreshError);
      }
    }

    // Handle other API errors
    if (error.response) {
      console.error('API Error:', error.response.data);
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('API Error: No response received', error.request);
    } else {
      console.error('API Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Removed local setRefreshToken and getRefreshToken as they are now imported from authService

export const login = (data: LoginRequest): Promise<AxiosResponse<LoginResponse>> => {
  // This login function is now handled in authService.ts
  // Keeping it here for potential future direct use or as a placeholder
  return apiClient.post('/auth/login/', data); // Use '/auth/login/' with trailing slash
};

export const signup = (data: SignupRequest): Promise<AxiosResponse<SignupResponse>> => {
  return apiClient.post('/auth/signup/', data); // Assuming the backend signup endpoint is '/auth/signup/'
};

export const passwordReset = (
  data: PasswordResetRequest
): Promise<AxiosResponse<PasswordResetResponse>> => {
  return apiClient.post('/auth/password-reset/', data); // Assuming the backend password reset request endpoint is '/auth/password-reset/'
};

export const fetchQuestions = (
  params?: FetchQuestionsRequest
): Promise<AxiosResponse<FetchQuestionsResponse>> => {
  return apiClient.get('/quiz/', { params });
};

export const submitAnswer = (
  data: SubmitAnswerRequest
): Promise<AxiosResponse<SubmitAnswerResponse>> => {
  return apiClient.post('/score/', data);
};

export default apiClient;
