import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { QuizSettings, GroupQuizSession } from '../../types/quiz.types';
import QuizService from '../../services/quizService';
import UserService from '../../services/userService';
import { QUIZ_SETTINGS_STORAGE_KEY } from '../../constants/storageKeys';
import { QuizSession } from '../../types/dashboard.types';
import {
  FetchQuestionsRequest,
  Question,
  FetchQuestionsResponse,
  Category,
} from '../../types/api.types';
import { setGroupSession, setGroupMode, setCurrentPlayer } from './groupQuizSlice';
import { RootState } from '../store';
import { HISTORY_CACHE_DURATION_MS, CATEGORIES_CACHE_DURATION_MS } from '../../constants/timings';
import { isLevel1Difficulty } from '../../constants/level1';
import { calculateQuizScore } from '../../utils/quizUtils';

interface LocalProgress {
  questionIds: number[];
  answers: Record<number, string>;
  timestamp: string;
}

interface QuizState {
  settings: QuizSettings;
  mode: string;
  category: string;
  categoryId: number | null | undefined;
  difficulty: string;
  difficultyId: number | null | undefined;
  isMixedMode?: boolean;
  currentQuestionIndex: number;
  questions: Question[];
  selectedAnswers: Record<number, string>;
  answerCorrectness: Record<number, boolean>;
  score: number;
  pointsPerQuestion: number;
  loading: boolean;
  error: string | null;
  guestProgress: {
    [quizId: string]: LocalProgress;
  };
  isGuestSession: boolean;
  guestQuizLimit: number;
  guestQuizCount: number;
  sessions: QuizSession[];
  historyLoading: boolean;
  historyError: string | null;
  lastHistoryFetch: number | null;
  categories: Category[];
  loadingCategories: boolean;
  categoryError: string | null;
  lastCategoriesFetch: number | null;
  savedSessionId: number | null;
}

const savedGuestProgress = localStorage.getItem('guestQuizProgress');
const savedGuestCount = localStorage.getItem('guestQuizCount');

const isAllowedCategoryInState = (
  categories: Category[],
  categoryId: number | null | undefined
): boolean => {
  if (categoryId === null || categoryId === undefined) {
    return true;
  }
  if (categories.length === 0) {
    return true;
  }
  return categories.some((category) => category.id === categoryId);
};

const initialState: QuizState = {
  settings: {
    mode: 'Solo',
    category: '',
    categoryId: null,
    difficulty: '',
    numberOfQuestions: 10,
  },
  mode: 'Solo',
  category: '',
  categoryId: null,
  difficulty: '',
  difficultyId: null,
  currentQuestionIndex: 0,
  questions: [],
  selectedAnswers: {},
  answerCorrectness: {},
  score: 0,
  pointsPerQuestion: 5,
  loading: false,
  error: null,
  guestProgress: savedGuestProgress ? JSON.parse(savedGuestProgress) : {},
  isGuestSession: false,
  guestQuizLimit: 3,
  guestQuizCount: savedGuestCount ? parseInt(savedGuestCount) : 0,
  sessions: [],
  historyLoading: false,
  historyError: null,
  lastHistoryFetch: null,
  categories: [],
  loadingCategories: false,
  categoryError: null,
  lastCategoriesFetch: null,
  savedSessionId: null,
};

// Load past quiz sessions for the current user
export const fetchQuizHistoryThunk = createAsyncThunk<
  QuizSession[],
  void,
  { state: { quiz: QuizState; auth: any }; rejectValue: string }
>(
  'quiz/fetchHistory',
  async (_, { getState, rejectWithValue }) => {
    const userId = getState().auth.userId;
    if (!userId) return rejectWithValue('Not authenticated');
    try {
      const sessions = await UserService.fetchUserQuizHistory(userId.toString());
      return sessions.map((session: QuizSession) => ({
        ...session,
        total_questions: session.total_questions,
      }));
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to load history');
    }
  },
  {
    condition: (_, { getState }) => {
      const { quiz, auth } = getState();
      // Don't fetch if already loading or not authenticated
      if (quiz.historyLoading || !auth.userId) return false;

      // Don't fetch if we have recent data
      if (quiz.sessions.length > 0 && quiz.lastHistoryFetch) {
        if (Date.now() - quiz.lastHistoryFetch < HISTORY_CACHE_DURATION_MS) {
          return false;
        }
      }

      return true;
    },
  }
);

// Async thunk for fetching categories
export const fetchCategoriesThunk = createAsyncThunk<
  Category[],
  void,
  { rejectValue: string; state: RootState }
>(
  'quiz/fetchCategories',
  async (_, { rejectWithValue, getState }) => {
    try {
      return await QuizService.fetchCategories();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch categories');
    }
  },
  {
    condition: (_, { getState }) => {
      const { quiz } = getState();
      // Don't fetch if already loading
      if (quiz.loadingCategories) return false;

      // Don't fetch if we have recent data
      if (quiz.categories.length > 0 && quiz.lastCategoriesFetch) {
        if (Date.now() - quiz.lastCategoriesFetch < CATEGORIES_CACHE_DURATION_MS) {
          return false;
        }
      }

      return true;
    },
  }
);

// Async thunk for saving quiz session
export const saveQuizSessionThunk = createAsyncThunk<
  any,
  {
    questions: { id: number; selected_answer: string }[];
    score: number;
    category_id: number | null | undefined;
    difficulty: string;
    is_group_session?: boolean;
    players?: { name: string; score: number }[];
  },
  { rejectValue: string }
>('quiz/saveQuizSession', async (quizSessionData, { rejectWithValue, getState }) => {
  try {
    const response = await QuizService.saveQuizSession(quizSessionData);

    // Note: Cache invalidation is now handled by Redis on the backend
    // No frontend cache invalidation needed as we rely on Redis-backed API responses

    return response;
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to save quiz session');
  }
});

// Async thunk for fetching quiz questions
export const fetchQuizQuestions = createAsyncThunk<
  FetchQuestionsResponse,
  FetchQuestionsRequest,
  { rejectValue: string; state: RootState }
>(
  'quiz/fetchQuizQuestions',
  async (params: FetchQuestionsRequest, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const count = params.count || state.quiz.settings.numberOfQuestions;

      if (
        params.category !== null &&
        params.category !== undefined &&
        !isAllowedCategoryInState(state.quiz.categories, params.category)
      ) {
        return rejectWithValue('Invalid category selected for the current quiz scope.');
      }

      if (params.difficulty && !isLevel1Difficulty(params.difficulty)) {
        return rejectWithValue('Invalid difficulty selected for Level 1.');
      }

      const response = await QuizService.fetchQuestions({ ...params, count });

      // Validate response
      if (!response || !response.questions || response.questions.length === 0) {
        return rejectWithValue('No questions found for the selected criteria.');
      }

      return response;
    } catch (error: any) {
      if (error.response) {
        return rejectWithValue(
          error.response.data?.detail ||
            error.response.data?.message ||
            'Failed to fetch quiz questions'
        );
      } else if (error.request) {
        return rejectWithValue(
          'No response from server. Please check your network connection and ensure the backend is running.'
        );
      } else {
        return rejectWithValue(
          error.message || 'An unexpected error occurred while fetching questions'
        );
      }
    }
  }
);

export const startGroupQuiz = createAsyncThunk<
  { questions: Question[] },
  {
    players: string[];
    categoryId: number | null | undefined;
    difficulty: string;
    numberOfQuestions: number;
  },
  { rejectValue: string; state: RootState }
>(
  'quiz/startGroupQuiz',
  async (
    { players, categoryId, difficulty, numberOfQuestions },
    { dispatch, rejectWithValue, getState }
  ) => {
    try {
      if (!isLevel1Difficulty(difficulty)) {
        return rejectWithValue(`Invalid difficulty level: ${difficulty}`);
      }

      const availableCategories = getState().quiz.categories;
      if (!isAllowedCategoryInState(availableCategories, categoryId)) {
        return rejectWithValue('Invalid category selected for current group mode scope.');
      }

      const backendSession = await QuizService.createGroupSession(
        players,
        categoryId,
        difficulty,
        numberOfQuestions
      );

      const frontendSession: GroupQuizSession = {
        id: backendSession.id,
        players: backendSession.group_players || [],
        currentQuestion: 0,
        totalQuestions: backendSession.totalQuestions || 0,
        category: backendSession.category || 'Mixed',
        difficulty: backendSession.difficulty || 'Unknown',
        status: 'active',
        currentPlayer: backendSession.group_players?.[0]?.id ?? 0,
        createdAt: backendSession.started_at,
        lastActive: backendSession.started_at,
        timeoutAt: new Date(
          new Date(backendSession.started_at).getTime() + 30 * 60 * 1000
        ).toISOString(),
      };

      dispatch(setGroupSession(frontendSession));
      dispatch(setGroupMode(true));

      if (frontendSession.players.length > 0) {
        dispatch(setCurrentPlayer(frontendSession.players[0]));
      }

      // Reuse questions already returned by the backend session creation
      // to avoid a redundant second HTTP request.
      const questions: Question[] = (backendSession.session_questions || []).map((sq) => ({
        id: sq.question.id,
        category: sq.question.category.name,
        difficulty: sq.question.difficulty.label,
        question_text: sq.question.question_text,
        correct_answer: sq.question.correct_answer,
        answer_options: sq.question.answer_options,
        metadata_json: sq.question.metadata_json,
        is_seeded: sq.question.is_seeded,
        is_fallback: sq.question.is_fallback,
        created_by: sq.question.created_by,
      }));
      return { questions };
    } catch (error: any) {
      dispatch(setGroupMode(false));
      dispatch(setGroupSession(null));
      dispatch(setCurrentPlayer(undefined));

      if (error.response) {
        return rejectWithValue(
          error.response.data?.detail ||
            error.response.data?.message ||
            'Server error while starting group quiz'
        );
      } else if (error.request) {
        return rejectWithValue('No response from server. Please check your network connection.');
      } else {
        return rejectWithValue(error.message || 'Failed to start group quiz');
      }
    }
  }
);

export const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    setQuizSettings: (state, action: PayloadAction<QuizSettings>) => {
      const isMixUpMode = action.payload.category === 'Mix Up' || action.payload.categoryId == null;
      const sanitizedCategoryId = isMixUpMode
        ? null
        : isAllowedCategoryInState(state.categories, action.payload.categoryId)
          ? action.payload.categoryId
          : null;
      const sanitizedDifficulty = isLevel1Difficulty(action.payload.difficulty)
        ? action.payload.difficulty
        : '';

      state.settings = {
        ...action.payload,
        categoryId: sanitizedCategoryId,
        difficulty: sanitizedDifficulty,
      };
      state.mode = action.payload.mode;
      state.category = isMixUpMode ? 'Mix Up' : action.payload.category;
      state.categoryId = sanitizedCategoryId;
      state.difficulty = sanitizedDifficulty;
      state.settings.numberOfQuestions = action.payload.numberOfQuestions;

      // Keep latest valid quiz settings to recover on hard refresh/direct /quiz visits.
      try {
        sessionStorage.setItem(
          QUIZ_SETTINGS_STORAGE_KEY,
          JSON.stringify({
            mode: action.payload.mode,
            category: isMixUpMode ? 'Mix Up' : action.payload.category,
            categoryId: sanitizedCategoryId,
            difficulty: sanitizedDifficulty,
            numberOfQuestions: action.payload.numberOfQuestions,
          })
        );
      } catch {
        // Ignore storage failures and continue runtime flow.
      }

      if (!isMixUpMode && action.payload.categoryId != null && sanitizedCategoryId == null) {
        state.error = 'Selected category is not available for the current quiz scope.';
        return;
      }

      if (action.payload.difficulty && !sanitizedDifficulty) {
        state.error = 'Selected difficulty is not available in Level 1.';
        return;
      }

      if (state.isGuestSession && state.guestQuizCount >= state.guestQuizLimit) {
        state.error = 'Guest quiz limit reached. Please sign up to continue.';
        return;
      }

      state.error = null;
    },

    setGuestSession: (state, action: PayloadAction<boolean>) => {
      state.isGuestSession = action.payload;
      if (action.payload) {
        state.guestQuizLimit = 3;
      }
    },

    hydrateQuestionsFromPrefetch: (state, action: PayloadAction<Question[]>) => {
      state.questions = action.payload;
      state.currentQuestionIndex = 0;
      state.selectedAnswers = {};
      state.answerCorrectness = {};
      state.score = 0;
      state.error = null;
    },

    selectAnswer: (state, action: PayloadAction<{ questionIndex: number; answer: string }>) => {
      state.selectedAnswers[action.payload.questionIndex] = action.payload.answer;
    },

    setAnswerCorrectness: (
      state,
      action: PayloadAction<{ questionIndex: number; isCorrect: boolean }>
    ) => {
      state.answerCorrectness[action.payload.questionIndex] = action.payload.isCorrect;
    },

    updateScore: (state) => {
      if (Object.keys(state.answerCorrectness).length > 0) {
        state.score = Object.values(state.answerCorrectness).filter(Boolean).length;
      } else {
        state.score = calculateQuizScore(state.selectedAnswers, state.questions);
      }

      if (state.isGuestSession) {
        const quizId = `quiz_${Date.now()}`;
        state.guestProgress[quizId] = {
          questionIds: state.questions.map((q) => q.id),
          answers: { ...state.selectedAnswers },
          timestamp: new Date().toISOString(),
        };

        state.guestQuizCount += 1;
        localStorage.setItem('guestQuizProgress', JSON.stringify(state.guestProgress));
        localStorage.setItem('guestQuizCount', state.guestQuizCount.toString());
      }
    },

    nextQuestion: (state) => {
      if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex += 1;
      }
    },
    incrementQuestionIndex: (state) => {
      state.currentQuestionIndex += 1;
    },

    resetQuiz: (state) => {
      const wasGuestSession = state.isGuestSession;
      const guestProgress = state.guestProgress;
      const guestQuizCount = state.guestQuizCount;

      const newState = { ...initialState };
      if (wasGuestSession) {
        newState.isGuestSession = true;
        newState.guestProgress = guestProgress;
        newState.guestQuizCount = guestQuizCount;
      }
      return newState;
    },

    clearGuestProgress: (state) => {
      state.guestProgress = {};
      state.guestQuizCount = 0;
      localStorage.removeItem('guestQuizProgress');
      localStorage.removeItem('guestQuizCount');
    },

    setSavedSessionId: (state, action: PayloadAction<number | null>) => {
      state.savedSessionId = action.payload;
    },

    invalidateQuizHistoryCache: (state, action: PayloadAction<number>) => {
      // Note: Quiz history cache invalidation is now handled by Redis on the backend
      // This action is kept for compatibility but no longer performs cache operations
      console.log('Quiz history invalidation handled by Redis backend for user:', action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuizQuestions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchQuizQuestions.fulfilled,
        (state, action: PayloadAction<FetchQuestionsResponse>) => {
          state.loading = false;
          if (action.payload.questions && action.payload.questions.length > 0) {
            state.questions = action.payload.questions;
            state.currentQuestionIndex = 0;
            state.selectedAnswers = {};
            state.answerCorrectness = {};
            state.score = 0;
            state.error = null;
          } else {
            state.error = 'No questions found for the selected criteria.';
          }
        }
      )
      .addCase(fetchQuizQuestions.rejected, (state, action) => {
        state.loading = false;
        state.questions = [];
        state.error = (action.payload as string) || 'Failed to fetch quiz questions';
        state.currentQuestionIndex = 0;
        state.selectedAnswers = {};
        state.answerCorrectness = {};
        state.score = 0;
      })
      .addCase(startGroupQuiz.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startGroupQuiz.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.questions && action.payload.questions.length > 0) {
          state.questions = action.payload.questions;
          state.currentQuestionIndex = 0;
          state.selectedAnswers = {};
          state.answerCorrectness = {};
          state.score = 0;
          state.error = null;
        } else {
          state.error = 'No questions available for group quiz.';
        }
      })
      .addCase(startGroupQuiz.rejected, (state, action) => {
        state.loading = false;
        state.questions = [];
        state.error = (action.payload as string) || 'Failed to start group quiz';
        state.currentQuestionIndex = 0;
        state.selectedAnswers = {};
        state.answerCorrectness = {};
        state.score = 0;
      })
      .addCase(saveQuizSessionThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveQuizSessionThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.savedSessionId = action.payload?.id ?? null;
      })
      .addCase(saveQuizSessionThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to save session';
      })
      .addCase(fetchQuizHistoryThunk.pending, (state) => {
        state.historyLoading = true;
        state.historyError = null;
      })
      .addCase(fetchQuizHistoryThunk.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.sessions = action.payload;
        state.lastHistoryFetch = Date.now();
      })
      .addCase(fetchQuizHistoryThunk.rejected, (state, action) => {
        state.historyLoading = false;
        state.historyError = action.payload as string;
      })
      .addCase(fetchCategoriesThunk.pending, (state) => {
        state.loadingCategories = true;
        state.categoryError = null;
      })
      .addCase(fetchCategoriesThunk.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.loadingCategories = false;
        state.categories = action.payload;
        state.lastCategoriesFetch = Date.now();
      })
      .addCase(fetchCategoriesThunk.rejected, (state, action) => {
        state.loadingCategories = false;
        state.categories = [];
        state.categoryError = (action.payload as string) || 'Failed to fetch categories';
      });
  },
});

export const {
  setQuizSettings,
  selectAnswer,
  setAnswerCorrectness,
  updateScore,
  nextQuestion,
  clearGuestProgress,
  incrementQuestionIndex,
  resetQuiz,
  setGuestSession,
  hydrateQuestionsFromPrefetch,
  setSavedSessionId,
  invalidateQuizHistoryCache,
} = quizSlice.actions;

export default quizSlice.reducer;
