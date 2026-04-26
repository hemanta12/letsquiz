import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import UserService from '../../services/userService';
import { UserProfile } from '../../types/api.types';
import { SessionDetail } from '../../types/dashboard.types';

interface CachedSessionDetail {
  data: SessionDetail;
  timestamp: number;
  sessionId: number;
}

interface UserState {
  profile: UserProfile | null;
  selectedDetailedSession: SessionDetail | null;
  cachedSessionDetails: Record<number, CachedSessionDetail>;
  loadingProfile: boolean;
  loadingSelectedDetailedSession: boolean;
  errorProfile: string | null;
  errorSelectedDetailedSession: string | null;
  lastProfileFetch: number | null;
}

const initialState: UserState = {
  profile: null,
  selectedDetailedSession: null,
  cachedSessionDetails: {},
  loadingProfile: false,
  loadingSelectedDetailedSession: false,
  errorProfile: null,
  errorSelectedDetailedSession: null,
  lastProfileFetch: null,
};

export const fetchUserProfile = createAsyncThunk<
  UserProfile,
  string,
  { state: RootState; rejectValue: string }
>(
  'user/fetchUserProfile',
  async (userId, { getState, rejectWithValue }) => {
    try {
      const profile = await UserService.fetchUserProfile(userId);
      return profile;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || err.message);
    }
  },
  {
    condition: (userId, { getState }) => {
      const { user } = getState();
      // Don't fetch if already loading
      if (user.loadingProfile) return false;

      // Don't fetch if we have recent data (10 minutes)
      if (user.profile && user.lastProfileFetch) {
        const now = Date.now();
        const PROFILE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes - aligned with backend cache
        if (now - user.lastProfileFetch < PROFILE_CACHE_DURATION) {
          return false;
        }
      }

      return true;
    },
  }
);

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
  if (cachedSession) {
    const now = Date.now();
    const CACHE_DURATION_MS = 8 * 60 * 1000; // 8 minutes - just under backend cache

    if (now - cachedSession.timestamp < CACHE_DURATION_MS) {
      console.log(`[Cache HIT] Using cached session ${sessionId}`);
      return cachedSession.data;
    }
  }

  console.log(`[Cache MISS] Fetching session ${sessionId} from API`);

  try {
    const rawDetail = await UserService.fetchQuizSessionDetails(sessionId);

    // Transform to SessionDetail format
    const detail: SessionDetail = {
      session_id: rawDetail.id,
      category: rawDetail.category ?? 'General',
      difficulty: rawDetail.difficulty ?? 'Medium',
      score: rawDetail.score,
      started_at: rawDetail.started_at,
      is_group_session: rawDetail.is_group_session ?? false,
      questions: rawDetail.questions.map((q) => ({
        id: q.id,
        question: q.text,
        userAnswer: q.selected_answer ?? '',
        correctAnswer: q.correct_answer ?? '',
        correctPlayer: undefined,
      })),
      group_players: (rawDetail.group_players ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        errors: p.errors ?? [],
        answers: ((p.answers ?? []) as any[]).map((a: any) =>
          typeof a === 'string'
            ? { question_id: 0, answer: a }
            : { question_id: a.question_id, answer: a.answer }
        ),
        correct_answers: p.correct_answers ?? {},
      })),
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
      console.log('[Cache] Cleared all session cache');
    },
    invalidateSessionCache(state, action: PayloadAction<number>) {
      const sessionId = action.payload;
      delete state.cachedSessionDetails[sessionId];
      console.log(`[Cache] Invalidated session ${sessionId}`);
    },
    cleanExpiredCache(state) {
      const now = Date.now();
      const CACHE_DURATION_MS = 8 * 60 * 1000; // 8 minutes - just under backend cache
      const expiredSessionIds: number[] = [];

      Object.entries(state.cachedSessionDetails).forEach(([sessionId, cachedSession]) => {
        if (now - cachedSession.timestamp >= CACHE_DURATION_MS) {
          expiredSessionIds.push(Number(sessionId));
        }
      });

      expiredSessionIds.forEach((sessionId) => {
        delete state.cachedSessionDetails[sessionId];
      });

      if (expiredSessionIds.length > 0) {
        console.log(`[Cache] Cleaned ${expiredSessionIds.length} expired sessions`);
      }
    },
    invalidateAllUserCache(state) {
      // Clear all cached data to force refresh
      state.cachedSessionDetails = {};
      state.lastProfileFetch = null;
      console.log('[Cache] Invalidated all user cache');
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
        state.lastProfileFetch = Date.now();
      })
      .addCase(fetchUserProfile.rejected, (state, { payload, error }) => {
        state.loadingProfile = false;
        state.errorProfile = payload ?? error.message ?? 'Failed to fetch profile';
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

        // Cache the session data
        const sessionId = meta.arg;
        state.cachedSessionDetails[sessionId] = {
          data: payload,
          timestamp: Date.now(),
          sessionId,
        };

        console.log(`[Cache] Stored session ${sessionId} in cache`);
      })
      .addCase(fetchSingleDetailedQuizSession.rejected, (state, { payload, error }) => {
        state.loadingSelectedDetailedSession = false;
        state.errorSelectedDetailedSession =
          payload ?? error.message ?? 'Failed to fetch detailed quiz session';
      });
  },
});

export const {
  clearSelectedDetailedSession,
  clearSessionCache,
  invalidateSessionCache,
  cleanExpiredCache,
  invalidateAllUserCache,
} = userSlice.actions;
export default userSlice.reducer;
