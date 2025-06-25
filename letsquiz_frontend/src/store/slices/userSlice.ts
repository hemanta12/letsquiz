import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import UserService from '../../services/userService';
import { UserProfile, FetchLeaderboardResponse, LeaderboardEntry } from '../../types/api.types';
import { SessionDetail, QuestionDetail } from '../../types/dashboard.types';

interface UserState {
  profile: UserProfile | null;
  leaderboard: LeaderboardEntry[];
  selectedDetailedSession: SessionDetail | null;
  loadingProfile: boolean;
  loadingLeaderboard: boolean;
  loadingSelectedDetailedSession: boolean;
  errorProfile: string | null;
  errorLeaderboard: string | null;
  errorSelectedDetailedSession: string | null;
}

const initialState: UserState = {
  profile: null,
  leaderboard: [],
  selectedDetailedSession: null,
  loadingProfile: false,
  loadingLeaderboard: false,
  loadingSelectedDetailedSession: false,
  errorProfile: null,
  errorLeaderboard: null,
  errorSelectedDetailedSession: null,
};

export const fetchUserProfile = createAsyncThunk<UserProfile, string, { rejectValue: string }>(
  'user/fetchUserProfile',
  async (userId, { rejectWithValue }) => {
    try {
      const profile = await UserService.fetchUserProfile(userId);
      return profile;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || err.message);
    }
  }
);

export const fetchLeaderboard = createAsyncThunk<
  FetchLeaderboardResponse,
  void,
  { rejectValue: string }
>('user/fetchLeaderboard', async (_, { rejectWithValue }) => {
  try {
    return await UserService.fetchLeaderboard();
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.detail || err.message);
  }
});

export const fetchSingleDetailedQuizSession = createAsyncThunk<
  SessionDetail,
  number,
  { state: RootState; rejectValue: string }
>('user/fetchSingleDetailedQuizSession', async (sessionId, { getState, rejectWithValue }) => {
  const userId = getState().auth.userId;
  if (!userId) {
    return rejectWithValue('User not authenticated or user ID not available');
  }
  try {
    const raw = await UserService.fetchQuizSessionDetails(sessionId);
    const detail: SessionDetail = {
      session_id: raw.id,
      category: raw.category ?? 'General',
      difficulty: raw.difficulty ?? 'Medium',
      score: raw.score,
      started_at: raw.started_at,
      is_group_session: raw.is_group_session ?? false,
      questions: raw.questions.map((q) => ({
        id: q.id,
        question: q.text,
        userAnswer: q.selected_answer ?? '',
        correctAnswer: q.correct_answer,
      })) as QuestionDetail[],
      group_players:
        raw.group_players?.map((player) => ({
          id: player.id,
          name: player.name,
          score: player.score,
          errors: player.errors ?? [],
          answers: (player.answers ?? []).map((a: any) => {
            if (typeof a === 'string') {
              return {
                question_id: 0,
                answer: a,
              };
            }
            return {
              question_id: a.question_id,
              answer: a.answer,
            };
          }),
        })) ?? [],
    };

    return detail;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.detail || err.message);
  }
});

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearSelectedDetailedSession(state) {
      state.selectedDetailedSession = null;
      state.errorSelectedDetailedSession = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // user profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.loadingProfile = true;
        state.errorProfile = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, { payload }) => {
        state.loadingProfile = false;
        state.profile = payload;
      })
      .addCase(fetchUserProfile.rejected, (state, { payload, error }) => {
        state.loadingProfile = false;
        state.errorProfile = payload ?? error.message ?? 'Failed to fetch profile';
      })

      // leaderboard
      .addCase(fetchLeaderboard.pending, (state) => {
        state.loadingLeaderboard = true;
        state.errorLeaderboard = null;
      })
      .addCase(fetchLeaderboard.fulfilled, (state, { payload }) => {
        state.loadingLeaderboard = false;
        state.leaderboard = payload.leaderboard;
      })
      .addCase(fetchLeaderboard.rejected, (state, { payload, error }) => {
        state.loadingLeaderboard = false;
        state.errorLeaderboard = payload ?? error.message ?? 'Failed to fetch leaderboard';
      })

      // detailed session
      .addCase(fetchSingleDetailedQuizSession.pending, (state) => {
        state.loadingSelectedDetailedSession = true;
        state.errorSelectedDetailedSession = null;
        state.selectedDetailedSession = null;
      })
      .addCase(fetchSingleDetailedQuizSession.fulfilled, (state, { payload }) => {
        state.loadingSelectedDetailedSession = false;
        state.selectedDetailedSession = payload;
      })
      .addCase(fetchSingleDetailedQuizSession.rejected, (state, { payload, error }) => {
        state.loadingSelectedDetailedSession = false;
        state.errorSelectedDetailedSession =
          payload ?? error.message ?? 'Failed to fetch detailed quiz session';
      });
  },
});

export const { clearSelectedDetailedSession } = userSlice.actions;
export default userSlice.reducer;
