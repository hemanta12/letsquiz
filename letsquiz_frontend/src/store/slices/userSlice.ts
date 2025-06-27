import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import UserService from '../../services/userService';
import { UserProfile, FetchLeaderboardResponse, LeaderboardEntry } from '../../types/api.types';
import { SessionDetail, QuestionDetail } from '../../types/dashboard.types';
import { fetchQuizHistoryThunk } from './quizSlice';

interface CachedSessionDetail {
  data: SessionDetail;
  timestamp: number;
  sessionId: number;
}

interface UserState {
  profile: UserProfile | null;
  leaderboard: LeaderboardEntry[];
  selectedDetailedSession: SessionDetail | null;
  cachedSessionDetails: Record<number, CachedSessionDetail>;
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
  cachedSessionDetails: {},
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

// Cache duration: 5 minutes (300,000 ms)
const CACHE_DURATION_MS = 5 * 60 * 1000;

export const fetchSingleDetailedQuizSession = createAsyncThunk<
  SessionDetail,
  number,
  { state: RootState; rejectValue: string }
>('user/fetchSingleDetailedQuizSession', async (sessionId, { getState, rejectWithValue }) => {
  const state = getState();
  const userId = state.auth.userId;

  if (!userId) {
    return rejectWithValue('User not authenticated or user ID not available');
  }

  // Check cache first
  const cachedSession = state.user.cachedSessionDetails[sessionId];
  const now = Date.now();

  if (cachedSession && now - cachedSession.timestamp < CACHE_DURATION_MS) {
    // Return cached data if it's still fresh
    return cachedSession.data;
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
          correct_answers: player.correct_answers ?? {},
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
    clearSessionCache(state) {
      state.cachedSessionDetails = {};
    },
    invalidateSessionCache(state, action) {
      const sessionId = action.payload;
      if (sessionId && state.cachedSessionDetails[sessionId]) {
        delete state.cachedSessionDetails[sessionId];
      }
    },
    cleanExpiredCache(state) {
      const now = Date.now();
      Object.keys(state.cachedSessionDetails).forEach((sessionIdStr) => {
        const sessionId = parseInt(sessionIdStr, 10);
        const cachedSession = state.cachedSessionDetails[sessionId];
        if (cachedSession && now - cachedSession.timestamp >= CACHE_DURATION_MS) {
          delete state.cachedSessionDetails[sessionId];
        }
      });
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
      .addCase(fetchSingleDetailedQuizSession.fulfilled, (state, { payload, meta }) => {
        state.loadingSelectedDetailedSession = false;
        state.selectedDetailedSession = payload;
        // Cache the session details
        const sessionId = meta.arg;
        state.cachedSessionDetails[sessionId] = {
          data: payload,
          timestamp: Date.now(),
          sessionId,
        };
      })
      .addCase(fetchSingleDetailedQuizSession.rejected, (state, { payload, error }) => {
        state.loadingSelectedDetailedSession = false;
        state.errorSelectedDetailedSession =
          payload ?? error.message ?? 'Failed to fetch detailed quiz session';
      })

      // Clear session cache when quiz history is refreshed
      .addCase(fetchQuizHistoryThunk.fulfilled, (state) => {
        state.cachedSessionDetails = {};
      });
  },
});

// Selectors
export const selectIsSessionCached = (state: RootState, sessionId: number): boolean => {
  const cachedSession = state.user.cachedSessionDetails[sessionId];
  if (!cachedSession) return false;

  const now = Date.now();
  return now - cachedSession.timestamp < CACHE_DURATION_MS;
};

export const selectCachedSession = (state: RootState, sessionId: number): SessionDetail | null => {
  const cachedSession = state.user.cachedSessionDetails[sessionId];
  if (!cachedSession) return null;

  const now = Date.now();
  if (now - cachedSession.timestamp >= CACHE_DURATION_MS) return null;

  return cachedSession.data;
};

export const {
  clearSelectedDetailedSession,
  clearSessionCache,
  invalidateSessionCache,
  cleanExpiredCache,
} = userSlice.actions;
export default userSlice.reducer;
