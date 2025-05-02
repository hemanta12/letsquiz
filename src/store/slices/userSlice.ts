import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import UserService from '../../services/userService';
import { UserProfile, FetchLeaderboardResponse, LeaderboardEntry } from '../../types/api.types';

interface UserState {
  profile: UserProfile | null;
  leaderboard: LeaderboardEntry[];
  loadingProfile: boolean;
  loadingLeaderboard: boolean;
  errorProfile: string | null;
  errorLeaderboard: string | null;
}

const initialState: UserState = {
  profile: null,
  leaderboard: [],
  loadingProfile: false,
  loadingLeaderboard: false,
  errorProfile: null,
  errorLeaderboard: null,
};

// Async thunk for fetching user profile
export const fetchUserProfile = createAsyncThunk<UserProfile, void, { rejectValue: string }>(
  'user/fetchUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await UserService.fetchUserProfile();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || error.message);
    }
  }
);

// Async thunk for fetching leaderboard
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

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Handle fetchUserProfile thunk states
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
      // Handle fetchLeaderboard thunk states
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

// Export actions and reducer
// export const { someAction } = userSlice.actions; // Export any reducers if added
export default userSlice.reducer;
