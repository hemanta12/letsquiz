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
} from '../types/api.types';

const API_BASE_URL = 'http://localhost:9000';

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

    if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._isRetry) {
      (originalRequest as any)._isRetry = true;

      try {
        const refreshToken = getRefreshToken();
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });

        const newAccessToken = refreshResponse.data.accessToken;
        setAuthToken(newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        setAuthToken(null);
        setRefreshToken(null);

        console.error('Unable to refresh token, logging out:', refreshError);
        return Promise.reject(refreshError);
      }
    }

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

export const login = (data: LoginRequest): Promise<AxiosResponse<LoginResponse>> => {
  return apiClient.post('/login', data);
};

export const signup = (data: SignupRequest): Promise<AxiosResponse<SignupResponse>> => {
  return apiClient.post('/user/signup/', data);
};

export const passwordReset = (
  data: PasswordResetRequest
): Promise<AxiosResponse<PasswordResetResponse>> => {
  return apiClient.post('/user/password-reset/', data);
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
