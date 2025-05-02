import axios, { AxiosResponse, AxiosError } from 'axios';
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
  UserProfile,
  FetchLeaderboardResponse,
  ErrorResponse,
} from '../types/api.types';

const API_BASE_URL = 'http://localhost:9000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the auth token
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

// Response interceptor for refresh token logic
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // If the error is 401 and it's not the refresh token request itself
    if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._isRetry) {
      (originalRequest as any)._isRetry = true; // Mark the request as being retried

      try {
        // Attempt to refresh the token (mock call)
        // In a real application, this would call your backend's refresh endpoint
        const refreshToken = getRefreshToken(); // Assuming you have a getRefreshToken function
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });

        const newAccessToken = refreshResponse.data.accessToken; // Assuming the response contains a new access token
        setAuthToken(newAccessToken); // Update the stored access token

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, remove the tokens and redirect to login
        setAuthToken(null);
        setRefreshToken(null); // Assuming you have a setRefreshToken function

        console.error('Unable to refresh token, logging out:', refreshError);
        // Redirect to login page - this might need to be handled outside the interceptor
        // window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
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

// Helper functions for token management
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

// Mock refresh token functions (replace with actual implementation)
const setRefreshToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem('refreshToken', token);
  } else {
    localStorage.removeItem('refreshToken');
  }
};

const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

// Authentication API calls
export const login = (data: LoginRequest): Promise<AxiosResponse<LoginResponse>> => {
  return apiClient.post('/user/login/', data);
};

export const signup = (data: SignupRequest): Promise<AxiosResponse<SignupResponse>> => {
  return apiClient.post('/user/signup/', data);
};

export const passwordReset = (
  data: PasswordResetRequest
): Promise<AxiosResponse<PasswordResetResponse>> => {
  return apiClient.post('/user/password-reset/', data);
};

// Quiz API calls
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

// User Data API calls
export const fetchUserProfile = (): Promise<AxiosResponse<UserProfile>> => {
  return apiClient.get('/user/');
};

export const fetchLeaderboard = (): Promise<AxiosResponse<FetchLeaderboardResponse>> => {
  return apiClient.get('/leaderboard/');
};

export default apiClient;
