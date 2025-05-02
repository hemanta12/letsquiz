import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AuthService from '../../services/authService';
import {
  LoginRequest,
  SignupRequest,
  PasswordResetRequest,
  LoginResponse,
  PasswordResetResponse,
  SignupResponse,
} from '../../types/api.types';

interface User {
  id: number;
  email: string;
  is_premium: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const user = localStorage.getItem('user');
const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

const initialState: AuthState = {
  user: user ? JSON.parse(user) : null,
  isAuthenticated: isAuthenticated,
  loading: false,
  error: null,
};

// Async thunk for login
export const loginUser = createAsyncThunk<LoginResponse, LoginRequest>(
  'auth/loginUser',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await AuthService.login(credentials);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || error.message);
    }
  }
);

// Async thunk for signup
export const signupUser = createAsyncThunk<SignupResponse, SignupRequest, { rejectValue: string }>(
  'auth/signupUser',
  async (
    credentials: SignupRequest,
    { rejectWithValue }
  ): Promise<SignupResponse | ReturnType<typeof rejectWithValue>> => {
    try {
      const response = await AuthService.signup(credentials);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || error.message);
    }
  }
);

// Async thunk for password reset
export const resetPassword = createAsyncThunk<
  PasswordResetResponse,
  PasswordResetRequest,
  { rejectValue: string }
>('auth/resetPassword', async (data: PasswordResetRequest, { rejectWithValue }) => {
  try {
    const response = await AuthService.resetPassword(data.email);
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || error.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.loading = false;
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<LoginResponse>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        localStorage.setItem('user', JSON.stringify(action.payload.user));
        localStorage.setItem('isAuthenticated', 'true');
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string;
      })
      // Signup
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;

        state.error = null;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Password Reset
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state, action: PayloadAction<PasswordResetResponse>) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
