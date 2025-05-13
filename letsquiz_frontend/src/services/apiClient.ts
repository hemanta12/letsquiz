import axios, {
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosRequestConfig,
} from 'axios';
import { getAuthToken, getRefreshToken, setRefreshToken } from './authService';
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

type InternalRequestConfig = InternalAxiosRequestConfig & {
  _retryCount?: number;
};

interface ApiErrorResponse {
  detail?: string;
  message?: string;
  code?: string;
  data?: any;
  [key: string]: any;
}

interface RequestQueueItem {
  config: InternalRequestConfig;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  retryCount: number;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

class ApiClientService {
  private requestQueue: RequestQueueItem[] = [];
  private isRefreshing = false;

  public readonly axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
  });

  private publicEndpoints = [
    '/categories/',
    '/questions/',
    '/guest/session/',
    '/auth/login/',
    '/auth/refresh/',
    '/auth/signup/',
  ];

  constructor() {
    this.axiosInstance.interceptors.request.use(
      this.handleRequest.bind(this),
      this.handleRequestError.bind(this)
    );
    this.axiosInstance.interceptors.response.use(
      this.handleResponse.bind(this),
      this.handleResponseError.bind(this)
    );
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  private async handleRequest(config: InternalAxiosRequestConfig) {
    const isPublic = this.publicEndpoints.some(
      (ep) => config.url === ep || config.url?.endsWith(ep)
    );
    if (!isPublic) {
      const token = getAuthToken();
      if (token && this.isTokenExpired(token)) {
        await this.refreshAccessToken();
      }
      const current = getAuthToken();
      if (current) {
        config.headers.Authorization = `Bearer ${current}`;
      }
    }

    const guestId = this.getGuestSessionId();
    if (guestId) {
      config.headers['X-Guest-Session-ID'] = guestId;
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
    const original = error.config as InternalRequestConfig;
    const retryCount = original._retryCount ?? 0;
    const isPublic = this.publicEndpoints.some((ep) => original.url?.endsWith(ep));

    if (error.response?.status === 401 && !isPublic && !this.isRefreshing) {
      if (retryCount < MAX_RETRIES) {
        return this.handleUnauthorizedError(error);
      }
    }

    if (
      (error.response?.status === 429 ||
        error.response?.status === 503 ||
        error.code === 'ECONNABORTED' ||
        !error.response) &&
      retryCount < MAX_RETRIES
    ) {
      return this.retryRequest(error);
    }

    return Promise.reject(this.formatError(error));
  }

  private async handleUnauthorizedError(error: AxiosError) {
    this.isRefreshing = true;
    try {
      await this.refreshAccessToken();
      const queue = [...this.requestQueue];
      this.requestQueue = [];
      return Promise.all(
        queue.map(({ config, resolve, reject }) => {
          const cfg = {
            ...config,
            headers: {
              ...config.headers,
              Authorization: `Bearer ${getAuthToken()}`,
            },
          } as InternalAxiosRequestConfig;
          return this.axiosInstance(cfg).then(resolve).catch(reject);
        })
      );
    } finally {
      this.isRefreshing = false;
    }
  }

  private retryRequest(error: AxiosError) {
    const config = error.config as InternalRequestConfig;
    const retryCount = config._retryCount ?? 0;
    return new Promise((resolve, reject) => {
      setTimeout(
        () => {
          config._retryCount = retryCount + 1;
          this.axiosInstance(config).then(resolve).catch(reject);
        },
        INITIAL_RETRY_DELAY * Math.pow(2, retryCount)
      );
    });
  }

  private async refreshAccessToken(): Promise<string> {
    const refresh = getRefreshToken();
    if (!refresh) throw new Error('No refresh token');
    const resp = await axios.post<{ access: string; refresh: string }>(
      `${API_BASE_URL}/auth/refresh/`,
      { refresh }
    );
    const { access, refresh: newRefresh } = resp.data;
    setAuthToken(access);
    setRefreshToken(newRefresh);
    return access;
  }

  private formatError(error: AxiosError<ApiErrorResponse>) {
    if (!error.response) {
      return { message: error.message || 'Network error', code: 'network_error', status: 0 };
    }
    const { status, data } = error.response;
    const msg = typeof data === 'string' ? data : data.detail || data.message || 'API error';
    return { message: msg, code: data.code || 'api_error', status, data };
  }

  private getGuestSessionId(): string | null {
    const raw = localStorage.getItem('guestUser');
    if (!raw) return null;
    try {
      return JSON.parse(raw).id;
    } catch {
      return null;
    }
  }

  // Public convenience methods:
  public get<T>(url: string, config?: AxiosRequestConfig) {
    return this.axiosInstance.get<T>(url, config);
  }
  public post<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.axiosInstance.post<T>(url, data, config);
  }
  public put<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.axiosInstance.put<T>(url, data, config);
  }
  public patch<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.axiosInstance.patch<T>(url, data, config);
  }
  public delete<T>(url: string, config?: AxiosRequestConfig) {
    return this.axiosInstance.delete<T>(url, config);
  }
}

const apiClientService = new ApiClientService();

// backward-compatible exports:
export const login = (d: LoginRequest) => apiClientService.post<LoginResponse>('/auth/login/', d);
export const signup = (d: SignupRequest) =>
  apiClientService.post<SignupResponse>('/auth/signup/', d);
export const passwordReset = (d: PasswordResetRequest) =>
  apiClientService.post<PasswordResetResponse>('/auth/password-reset/', d);
export const fetchQuestions = (p?: FetchQuestionsRequest) =>
  apiClientService.get<FetchQuestionsResponse>('/questions/', { params: p });
export const submitAnswer = (d: SubmitAnswerRequest) =>
  apiClientService.post<SubmitAnswerResponse>('/score/', d);
export const fetchUserStats = (id: string) =>
  apiClientService.get<UserStatsResponse>(`/users/${id}/stats/`);

export const setAuthToken = (token: string | null): void => {
  if (token) localStorage.setItem('authToken', token);
  else localStorage.removeItem('authToken');
};

export default apiClientService;
