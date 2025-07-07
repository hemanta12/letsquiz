import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AuthService from '../../services/authService';
import { AppDispatch, RootState } from '../store';
import { LoginRequest, LoginResponse, SignupResponse, SignupRequest } from '../../types/api.types';
import { AES, enc } from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';

const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'default-key';
// const SESSION_CHECK_INTERVAL = 60 * 1000;

export interface User {
  id: number;
  email: string;
  username?: string;
  is_premium: boolean;
  isGuest: false;
}

interface GuestUser {
  id: string;
  isGuest: true;
  createdAt: string;
  expiresAt: string;
}

interface FeatureGates {
  canAccessPremiumContent: boolean;
  maxQuestionsPerQuiz: number;
  canSaveProgress: boolean;
}

export interface AuthState {
  user: User | GuestUser | null;
  userId: number | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  loading: boolean;
  error: {
    message: string;
    code: string;
    status: number;
  } | null;
  accessToken: string | null;
  tokenExpiresAt: number | null;
  featureGates: FeatureGates;
  guestProgress: {
    quizzes: number;
    totalScore: number;
    lastQuizDate: string | null;
  };
}

const securelyRetrieveData = (key: string): any => {
  const encrypted = localStorage.getItem(key);
  if (!encrypted) return null;

  try {
    const decrypted = AES.decrypt(encrypted, ENCRYPTION_KEY).toString(enc.Utf8);
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
};

const securelyStoreData = (key: string, data: any): void => {
  const encrypted = AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
  localStorage.setItem(key, encrypted);
};

// Check if token is expired
if (securelyRetrieveData('tokenExpiresAt') && Date.now() > securelyRetrieveData('tokenExpiresAt')) {
  localStorage.removeItem('authToken');
  localStorage.removeItem('tokenExpiresAt');
  localStorage.removeItem('user');
  localStorage.removeItem('isAuthenticated');
}

const initialState: AuthState = (() => {
  const sessionData = AuthService.getSessionData();
  const isAuthenticated = !!sessionData?.token && !isTokenExpired(sessionData?.expiresAt);
  const user = securelyRetrieveData('user');
  const guestUser = securelyRetrieveData('guestUser');
  const guestProgress = securelyRetrieveData('guestProgress');

  return {
    user: user || (guestUser && !isTokenExpired(guestUser.expiresAt) ? guestUser : null),
    isAuthenticated: isAuthenticated,
    userId: isAuthenticated ? user?.id || null : null,
    isGuest: !!guestUser && !isTokenExpired(guestUser.expiresAt) && !isAuthenticated,
    loading: false,
    error: null,
    accessToken: sessionData?.token || null,
    tokenExpiresAt: sessionData?.expiresAt || null,
    featureGates: {
      canAccessPremiumContent: false,
      maxQuestionsPerQuiz: 10,
      canSaveProgress: false,
    },
    guestProgress: guestProgress || {
      quizzes: 0,
      totalScore: 0,
      lastQuizDate: null,
    },
  };
})();

function isTokenExpired(expiresAt: string | number | null): boolean {
  if (!expiresAt) return true;
  return Date.now() > (typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt);
}

// Async thunk for token refresh
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const success = await AuthService.refreshSession();
      if (!success) {
        dispatch(logout());
        return rejectWithValue('Session expired');
      }
      return success;
    } catch (error) {
      dispatch(logout());
      return rejectWithValue('Failed to refresh session');
    }
  }
);

interface AuthError {
  message: string;
  code: string;
  status: number;
}

export const loginUser = createAsyncThunk<
  LoginResponse,
  LoginRequest,
  { dispatch: AppDispatch; state: RootState; rejectValue: AuthError }
>('auth/loginUser', async (credentials: LoginRequest, { dispatch, rejectWithValue }) => {
  try {
    console.log('[Auth] Login attempt with data:', credentials);
    const response = await AuthService.login(credentials);
    console.log('[Auth] Login response:', response);
    return response;
  } catch (error: any) {
    if (error.code && error.message && error.status) {
      return rejectWithValue(error);
    }
    return rejectWithValue({
      message: error.message || 'An unexpected error occurred',
      code: 'system_error',
      status: 500,
    });
  }
});

export const signupUser = createAsyncThunk<
  SignupResponse,
  SignupRequest,
  { rejectValue: AuthError }
>('auth/signupUser', async (credentials, { rejectWithValue }) => {
  try {
    const response = await AuthService.signup(credentials);
    return response;
  } catch (error: any) {
    if (error.code && error.message && error.status) {
      return rejectWithValue(error);
    }
    return rejectWithValue({
      message: error.message || 'An unexpected error occurred',
      code: 'system_error',
      status: 500,
    });
  }
});

export const createGuestSession = createAsyncThunk('auth/createGuestSession', async () => {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  const guestUser: GuestUser = {
    id: uuidv4(),
    isGuest: true,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  return guestUser;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | GuestUser | null>) => {
      state.user = action.payload;
    },
    logout: (state) => {
      console.log('[Auth] Logging out user', { userId: state.user?.id });
      if (state.isGuest) {
        console.log('[Auth] Saving guest progress', state.guestProgress);
        securelyStoreData('guestProgress', state.guestProgress);
      } else {
        state.user = null;
        state.isAuthenticated = false;
        state.isGuest = false;
        state.error = null;
        state.loading = false;
        state.accessToken = null;
        state.tokenExpiresAt = null;
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenExpiresAt');
        localStorage.removeItem('userId');
        localStorage.removeItem('refreshTokenData');
        localStorage.removeItem('sessionData');
        localStorage.removeItem('guestUser');
        localStorage.removeItem('guestProgress');
      }
    },
    updateGuestProgress: (state, action: PayloadAction<{ score: number }>) => {
      if (state.isGuest && state.guestProgress) {
        console.log('[Auth] Updating guest progress', {
          currentScore: state.guestProgress.totalScore,
          newScore: action.payload.score,
        });
        state.guestProgress.quizzes += 1;
        state.guestProgress.totalScore += action.payload.score;
        state.guestProgress.lastQuizDate = new Date().toISOString();
        securelyStoreData('guestProgress', state.guestProgress);
      }
    },
    clearGuestSession: (state) => {
      state.user = null;
      state.isGuest = false;
      state.guestProgress = {
        quizzes: 0,
        totalScore: 0,
        lastQuizDate: null,
      };
      localStorage.removeItem('guestUser');
      localStorage.removeItem('guestProgress');
    },
    sessionExpired: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.accessToken = null;
      state.tokenExpiresAt = null;
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenExpiresAt');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createGuestSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isGuest = true;
        state.error = null;
        securelyStoreData('guestUser', action.payload);
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as { message: string; code: string; status: number };
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<LoginResponse>) => {
        console.log('[Auth] loginUser.fulfilled - Payload:', action.payload);
        state.isGuest = false;
        const { user, access } = action.payload;

        // Ensure we have a valid user ID before proceeding
        if (!user || typeof user.id !== 'number') {
          console.error('[Auth] Invalid user ID in login response:', user);
          state.isAuthenticated = false;
          state.userId = null;
          return;
        }

        // Always ensure username is present
        const userWithUsername: User = {
          ...user,
          username:
            typeof user.username === 'string' && user.username
              ? user.username
              : user.email || 'User',
          isGuest: false,
        };

        console.log('[Auth] User logged in successfully. Updating state:', {
          userId: user.id,
          isPremium: user.is_premium,
        });

        // Set user ID first to ensure it's available immediately
        state.userId = user.id;
        state.user = userWithUsername;
        console.log('[Auth] State.user after assignment:', state.user);
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
        state.accessToken = access;
        state.tokenExpiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

        console.log('[Auth] State after login success:', {
          isAuthenticated: state.isAuthenticated,
          userId: state.userId,
          user: state.user,
        });

        // Store data securely
        console.log('[Auth] Storing user data:', {
          user,
          userId: user.id,
          accessToken: access,
          expiresAt: state.tokenExpiresAt,
        });

        securelyStoreData('user', userWithUsername);
        securelyStoreData('userId', user.id);
        securelyStoreData('isAuthenticated', true);
        securelyStoreData('authToken', access);
        securelyStoreData('tokenExpiresAt', state.tokenExpiresAt);
      })
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as { message: string; code: string; status: number };
      })
      .addCase(refreshToken.fulfilled, (state) => {
        console.log('[Auth] Token refreshed successfully', {
          newExpiration: Date.now() + 30 * 60 * 1000,
        });
        state.tokenExpiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes
        securelyStoreData('tokenExpiresAt', state.tokenExpiresAt);
      })
      .addCase(refreshToken.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.accessToken = null;
        state.tokenExpiresAt = null;
      });
  },
});

export const { logout, updateGuestProgress, clearGuestSession, sessionExpired, setUser } =
  authSlice.actions;
export default authSlice.reducer;
