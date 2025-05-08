import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import UserService from '../../services/userService';
import { UserProfile, FetchLeaderboardResponse, LeaderboardEntry } from '../../types/api.types';
import { QuizSession } from '../../types/dashboard.types';
import { loginUser } from './authSlice';

interface UserState {
  profile: UserProfile | null;
  leaderboard: LeaderboardEntry[];
  selectedDetailedSession: QuizSession | null;
  loadingProfile: boolean;
  loadingLeaderboard: boolean;
  loadingSelectedDetailedSession: boolean;
  errorProfile: string | null;
  errorLeaderboard: string | null;
  errorSelectedDetailedSession: string | null;
}

const initialState: UserState = {
  profile: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') as string) : null,
  leaderboard: [],
  selectedDetailedSession: null, // Initialize selectedDetailedSession
  loadingProfile: false,
  loadingLeaderboard: false,
  loadingSelectedDetailedSession: false, // Initialize loading state
  errorProfile: null,
  errorLeaderboard: null,
  errorSelectedDetailedSession: null, // Initialize error state
};

export const fetchUserProfile = createAsyncThunk<UserProfile, number, { rejectValue: string }>(
  'user/fetchUserProfile',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await UserService.fetchUserProfile(userId.toString());
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || error.message);
    }
  }
);

export const fetchLeaderboard = createAsyncThunk<
  FetchLeaderboardResponse,
  void,
  { rejectValue: string }
>('user/fetchLeaderboard', async (_, { rejectWithValue }) => {
  try {
    const response = await UserService.fetchLeaderboard();
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || error.message);
  }
});

export const fetchSingleDetailedQuizSession = createAsyncThunk<
  QuizSession | undefined,
  number,
  { rejectValue: string }
>('user/fetchSingleDetailedQuizSession', async (sessionId, { getState, rejectWithValue }) => {
  try {
    const state = getState() as { user: UserState };
    const userId = state.user.profile?.id;

    if (!userId) {
      throw new Error('User not authenticated or user ID not available');
    }

    const quizHistory = await UserService.fetchUserQuizHistory(userId.toString());

    const session = quizHistory.find((session: QuizSession) => session.id === sessionId);

    if (session) {
      return session;
    } else {
      return undefined;
    }
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || error.message);
  }
});

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearSelectedDetailedSession: (state) => {
      state.selectedDetailedSession = null;
      state.errorSelectedDetailedSession = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSingleDetailedQuizSession.pending, (state) => {
        state.loadingSelectedDetailedSession = true;
        state.errorSelectedDetailedSession = null;
        state.selectedDetailedSession = null;
      })
      .addCase(
        fetchSingleDetailedQuizSession.fulfilled,
        (state, action: PayloadAction<QuizSession | undefined>) => {
          state.loadingSelectedDetailedSession = false;
          state.selectedDetailedSession = action.payload || null;
          state.errorSelectedDetailedSession = null;
        }
      )
      .addCase(
        fetchSingleDetailedQuizSession.rejected,
        (state, action: PayloadAction<string | undefined>) => {
          state.loadingSelectedDetailedSession = false;
          state.selectedDetailedSession = null;
          state.errorSelectedDetailedSession =
            action.payload || 'Failed to fetch detailed quiz session';
        }
      )
      .addCase(fetchUserProfile.pending, (state) => {
        state.loadingProfile = true;
        state.errorProfile = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action: PayloadAction<UserProfile>) => {
        state.loadingProfile = false;
        state.profile = action.payload;
        state.errorProfile = null;
      })
      .addCase(fetchUserProfile.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.loadingProfile = false;
        state.profile = null;
        state.errorProfile = action.payload || 'Failed to fetch user profile';
      })
      .addCase(fetchLeaderboard.pending, (state) => {
        state.loadingLeaderboard = true;
        state.errorLeaderboard = null;
      })
      .addCase(
        fetchLeaderboard.fulfilled,
        (state, action: PayloadAction<FetchLeaderboardResponse>) => {
          state.loadingLeaderboard = false;
          state.leaderboard = action.payload.leaderboard;
          state.errorLeaderboard = null;
        }
      )
      .addCase(fetchLeaderboard.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.loadingLeaderboard = false;
        state.leaderboard = [];
        state.errorLeaderboard = action.payload || 'Failed to fetch leaderboard';
      });
  },
});

export const { clearSelectedDetailedSession } = userSlice.actions;
export default userSlice.reducer;
