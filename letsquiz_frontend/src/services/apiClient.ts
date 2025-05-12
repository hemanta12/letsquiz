import axios, {
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosRequestConfig,
} from 'axios';
import { getRefreshToken, setRefreshToken } from './authService';
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
  UserStatsResponse,
} from '../types/api.types';

interface ApiErrorResponse {
  detail?: string;
  message?: string;
  code?: string;
  data?: any;
  [key: string]: any; // Allow for additional error fields from backend
}

interface RequestQueueItem {
  config: AxiosRequestConfig;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  retryCount: number;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

class ApiClientService {
  private requestQueue: RequestQueueItem[] = [];
  private isRefreshing = false;
  private processingQueue = false;
  public readonly axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.initializeAxiosInstance();
  }

  private initializeAxiosInstance() {
    this.axiosInstance.interceptors.request.use(
      this.handleRequest.bind(this),
      this.handleRequestError.bind(this)
    );

    this.axiosInstance.interceptors.response.use(
      this.handleResponse.bind(this),
      this.handleResponseError.bind(this)
    );
  }

  private publicEndpoints = [
    '/categories/',
    '/questions/',
    '/guest/session/',
    '/auth/login/',
    '/auth/refresh/',
    '/auth/signup/',
  ];

  private isTokenExpired(token: string): boolean {
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      return tokenData.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  private async handleRequest(config: InternalAxiosRequestConfig) {
    const isPublicEndpoint = this.publicEndpoints.some(
      (endpoint) => config.url === endpoint || config.url?.endsWith(endpoint)
    );

    if (!isPublicEndpoint) {
      const token = getAuthToken();
      if (token && this.isTokenExpired(token)) {
        await this.refreshAccessToken();
      }

      const currentToken = getAuthToken();
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
      }
    }

    const guestSessionId = this.getGuestSessionId();
    if (guestSessionId) {
      config.headers['X-Guest-Session-ID'] = guestSessionId;
    }

    return config;
  }

  private handleRequestError(error: any) {
    return Promise.reject(error);
  }

  private handleResponse(response: AxiosResponse) {
    return response;
  }

  private async handleResponseError(error: AxiosError<ApiErrorResponse>) {
    console.log('Handling response error:', error);

    const originalRequest = error.config as InternalAxiosRequestConfig;
    const retryCount = (originalRequest as any)._retryCount || 0;

    const isPublic = this.publicEndpoints.some((ep) => originalRequest.url?.endsWith(ep));

    if (error.response?.status === 401 && !isPublic && !this.isRefreshing) {
      if (retryCount < MAX_RETRIES) {
        return this.handleUnauthorizedError(error);
      }
    }

    if (this.shouldRetry(error) && retryCount < MAX_RETRIES) {
      return this.retryRequest(error);
    }

    console.error('API Error:', error);
    console.error('API Error Response Data:', error.response?.data);

    return Promise.reject(this.formatError(error));
  }

  private async handleUnauthorizedError(error: AxiosError) {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      try {
        await this.refreshAccessToken();
        return this.retryFailedRequests();
      } catch (refreshError) {
        this.clearQueue(refreshError);
        throw refreshError;
      } finally {
        this.isRefreshing = false;
      }
    }

    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        config: error.config!,
        resolve,
        reject,
        retryCount: (error.config as any)._retryCount || 0,
      });
    });
  }

  private shouldRetry(error: AxiosError): boolean {
    return (
      error.response?.status === 429 ||
      error.response?.status === 503 ||
      error.code === 'ECONNABORTED' ||
      !error.response
    );
  }

  private async retryRequest(error: AxiosError) {
    const retryCount = (error.config as any)._retryCount || 0;
    const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);

    await new Promise((resolve) => setTimeout(resolve, delay));

    const newConfig = {
      ...error.config,
      _retryCount: retryCount + 1,
    } as InternalAxiosRequestConfig;

    return this.axiosInstance(newConfig);
  }

  private async refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post<{ access: string; refresh: string }>(
        `${API_BASE_URL}/auth/refresh/`,
        {
          refresh: refreshToken,
        }
      );

      const { access, refresh } = response.data;
      setAuthToken(access);
      setRefreshToken(refresh);

      return access;
    } catch (error) {
      setAuthToken(null);
      setRefreshToken(null);
      throw error;
    }
  }

  private async retryFailedRequests() {
    const requestsToRetry = [...this.requestQueue];
    this.requestQueue = [];

    return Promise.all(
      requestsToRetry.map(({ config, resolve, reject }) => {
        const newConfig = {
          ...config,
          headers: {
            ...config.headers,
            Authorization: `Bearer ${getAuthToken()}`,
          },
        } as InternalAxiosRequestConfig;

        return this.axiosInstance(newConfig).then(resolve).catch(reject);
      })
    );
  }

  private clearQueue(error: any) {
    this.requestQueue.forEach(({ reject }) => reject(error));
    this.requestQueue = [];
  }

  private formatError(error: AxiosError<ApiErrorResponse>) {
    if (!error.response) {
      return {
        message: error.message || 'Network error occurred',
        code: 'network_error',
        status: 0,
      };
    }

    const { status, data: errorResponse } = error.response;

    if (status === 401) {
      const errorMessage =
        typeof errorResponse === 'object' && errorResponse
          ? errorResponse.detail ||
            errorResponse.message ||
            (typeof errorResponse === 'string' ? errorResponse : null) ||
            'Authentication failed'
          : 'Authentication failed';

      return {
        message: errorMessage,
        code: 'invalid_credentials',
        status: 401,
        data: errorResponse,
      };
    }

    // Handle other error responses
    if (errorResponse) {
      // Handle string responses
      if (typeof errorResponse === 'string') {
        return {
          message: errorResponse,
          code: 'api_error',
          status: status,
        };
      }

      // Handle object responses
      return {
        message: errorResponse.detail || errorResponse.message || 'An error occurred',
        code: errorResponse.code || 'api_error',
        status: status,
        data: errorResponse,
      };
    }

    // Default error when no response data is available
    return {
      message: error.message || 'An unexpected error occurred',
      code: 'system_error',
      status: status || 500,
    };
  }

  private getGuestSessionId(): string | null {
    const guestUser = localStorage.getItem('guestUser');
    if (guestUser) {
      try {
        const parsed = JSON.parse(guestUser);
        return parsed.id;
      } catch {
        return null;
      }
    }
    return null;
  }

  // Public API methods
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  public async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  public async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  public async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch<T>(url, data, config);
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }
}

const apiClientService = new ApiClientService();

// Exported API methods for backward compatibility
export const login = (data: LoginRequest): Promise<AxiosResponse<LoginResponse>> => {
  return apiClientService.post('/auth/login/', data);
};

export const signup = (data: SignupRequest): Promise<AxiosResponse<SignupResponse>> => {
  return apiClientService.post('/auth/signup/', data);
};

export const passwordReset = (
  data: PasswordResetRequest
): Promise<AxiosResponse<PasswordResetResponse>> => {
  return apiClientService.post('/auth/password-reset/', data);
};

export const fetchQuestions = (
  params?: FetchQuestionsRequest
): Promise<AxiosResponse<FetchQuestionsResponse>> => {
  return apiClientService.get('/questions/', { params });
};

export const submitAnswer = (
  data: SubmitAnswerRequest
): Promise<AxiosResponse<SubmitAnswerResponse>> => {
  return apiClientService.post('/score/', data);
};

export const fetchUserStats = (userId: string): Promise<AxiosResponse<UserStatsResponse>> => {
  return apiClientService.get(`/users/${userId}/stats/`);
};

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

export default apiClientService;
