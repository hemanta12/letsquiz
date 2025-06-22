import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { QuizSettings, GroupQuizSession } from '../../types/quiz.types';
import QuizService from '../../services/quizService';
import { QuizSession } from '../../types/dashboard.types';
import {
  FetchQuestionsRequest,
  Question,
  FetchQuestionsResponse,
  Category,
} from '../../types/api.types';
import { setGroupSession, setGroupMode, setCurrentPlayer } from './groupQuizSlice';
import { RootState } from '../store';

interface LocalProgress {
  questionIds: number[];
  answers: Record<number, string>;
  timestamp: string;
}

interface MigrationState {
  status: 'idle' | 'in_progress' | 'completed' | 'failed';
  error: string | null;
  backup: {
    guestProgress: Record<string, LocalProgress>;
    guestQuizCount: number;
  } | null;
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
  migration: MigrationState;
  sessions: QuizSession[];
  historyLoading: boolean;
  historyError: string | null;
  categories: Category[];
  loadingCategories: boolean;
  categoryError: string | null;
  savedSessionId: number | null;
}

const savedGuestProgress = localStorage.getItem('guestQuizProgress');
const savedGuestCount = localStorage.getItem('guestQuizCount');

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
  score: 0,
  pointsPerQuestion: 5,
  loading: false,
  error: null,
  guestProgress: savedGuestProgress ? JSON.parse(savedGuestProgress) : {},
  isGuestSession: false,
  guestQuizLimit: 3,
  guestQuizCount: savedGuestCount ? parseInt(savedGuestCount) : 0,
  migration: {
    status: 'idle',
    error: null,
    backup: null,
  },
  sessions: [],
  historyLoading: false,
  historyError: null,
  categories: [],
  loadingCategories: false,
  categoryError: null,
  savedSessionId: null,
};

// Load past quiz sessions for the current user
export const fetchQuizHistoryThunk = createAsyncThunk<
  QuizSession[],
  void,
  { state: { quiz: QuizState; auth: any }; rejectValue: string }
>('quiz/fetchHistory', async (_, { getState, rejectWithValue }) => {
  const userId = getState().auth.userId;
  if (!userId) return rejectWithValue('Not authenticated');
  try {
    const sessions = await QuizService.fetchUserSessions(userId);
    return sessions.map((session) => ({
      ...session,
      total_questions: session.total_questions,
    }));
  } catch (err: any) {
    return rejectWithValue(err.message || 'Failed to load history');
  }
});

// Async thunk for fetching categories
export const fetchCategoriesThunk = createAsyncThunk<Category[], void, { rejectValue: string }>(
  'quiz/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      return await QuizService.fetchCategories();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch categories');
    }
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
>('quiz/saveQuizSession', async (quizSessionData, { rejectWithValue }) => {
  try {
    const response = await QuizService.saveQuizSession(quizSessionData);
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
      const numberOfQuestions = state.quiz.settings.numberOfQuestions;
      const response = await QuizService.fetchQuestions({ ...params, count: numberOfQuestions });
      console.log('fetchQuizQuestions thunk - response:', response);

      // Validate response
      if (!response || !response.questions || response.questions.length === 0) {
        return rejectWithValue('No questions found for the selected criteria.');
      }

      return response;
    } catch (error: any) {
      console.error('fetchQuizQuestions thunk - error:', error);

      if (error.response) {
        return rejectWithValue(
          error.response.data?.detail ||
            error.response.data?.message ||
            'Failed to fetch quiz questions'
        );
      } else if (error.request) {
        return rejectWithValue('No response from server. Please check your network connection.');
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
  { rejectValue: string }
>(
  'quiz/startGroupQuiz',
  async ({ players, categoryId, difficulty, numberOfQuestions }, { dispatch, rejectWithValue }) => {
    try {
      const difficultyMap: { [key: string]: number } = {
        Easy: 1,
        Medium: 2,
        Hard: 3,
        'Quiz Genius': 3,
      };
      const difficultyId = difficultyMap[difficulty];

      if (difficultyId === undefined) {
        return rejectWithValue(`Invalid difficulty level: ${difficulty}`);
      }

      const backendSession = await QuizService.createGroupSession(
        players,
        categoryId,
        difficultyId,
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

      const { questions } = await QuizService.fetchQuestions({
        category: categoryId,
        difficulty,
        count: numberOfQuestions,
      });
      return { questions };
    } catch (error: any) {
      dispatch(setGroupMode(false));
      dispatch(setGroupSession(null));
      dispatch(setCurrentPlayer(undefined));
      return rejectWithValue(error.message || 'Failed to start group quiz');
    }
  }
);

export const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    setQuizSettings: (state, action: PayloadAction<QuizSettings>) => {
      state.settings = action.payload;
      state.mode = action.payload.mode;
      state.category = action.payload.category;
      state.categoryId = action.payload.categoryId;
      state.difficulty = action.payload.difficulty;
      state.settings.numberOfQuestions = action.payload.numberOfQuestions;

      if (state.isGuestSession && state.guestQuizCount >= state.guestQuizLimit) {
        state.error = 'Guest quiz limit reached. Please sign up to continue.';
        return;
      }
    },

    startMigration: (state) => {
      state.migration = {
        status: 'in_progress',
        error: null,
        backup: {
          guestProgress: { ...state.guestProgress },
          guestQuizCount: state.guestQuizCount,
        },
      };
    },

    completeMigration: (state) => {
      state.migration.status = 'completed';
      state.migration.error = null;
      state.guestProgress = {};
      state.guestQuizCount = 0;
      localStorage.removeItem('guestQuizProgress');
      localStorage.removeItem('guestQuizCount');
    },

    failMigration: (state, action: PayloadAction<string>) => {
      state.migration.status = 'failed';
      state.migration.error = action.payload;
    },

    rollbackMigration: (state) => {
      if (state.migration.backup) {
        state.guestProgress = state.migration.backup.guestProgress;
        state.guestQuizCount = state.migration.backup.guestQuizCount;
        localStorage.setItem('guestQuizProgress', JSON.stringify(state.guestProgress));
        localStorage.setItem('guestQuizCount', state.guestQuizCount.toString());
      }
      state.migration = {
        status: 'idle',
        error: null,
        backup: null,
      };
    },

    setGuestSession: (state, action: PayloadAction<boolean>) => {
      state.isGuestSession = action.payload;
      if (action.payload) {
        state.guestQuizLimit = 3;
      }
    },

    selectAnswer: (state, action: PayloadAction<{ questionIndex: number; answer: string }>) => {
      state.selectedAnswers[action.payload.questionIndex] = action.payload.answer;
    },

    updateScore: (state) => {
      state.score = Object.entries(state.selectedAnswers).reduce((score, [index, answer]) => {
        const points = answer === state.questions[Number(index)].correct_answer ? 1 : 0;
        return score + points;
      }, 0);

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
      const migration = state.migration;

      const newState = { ...initialState };
      if (wasGuestSession) {
        newState.isGuestSession = true;
        newState.guestProgress = guestProgress;
        newState.guestQuizCount = guestQuizCount;
        newState.migration = migration;
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
          console.log('fetchQuizQuestions.fulfilled - action.payload:', action.payload);
          state.loading = false;
          state.questions = action.payload.questions;
          console.log('fetchQuizQuestions.fulfilled - state.loading:', state.loading);
          console.log(
            'fetchQuizQuestions.fulfilled - questions length:',
            action.payload.questions.length
          );
          state.currentQuestionIndex = 0;
          state.selectedAnswers = {};
          state.score = 0;
          if (state.questions.length === 0) {
            state.error = 'No questions found for the selected criteria.';
          } else {
            state.error = null;
          }
        }
      )
      .addCase(fetchQuizQuestions.rejected, (state, action) => {
        state.loading = false;
        state.questions = [];
        state.error = (action.payload as string) || 'Failed to fetch quiz questions';
        state.currentQuestionIndex = 0;
        state.selectedAnswers = {};
        state.score = 0;
        console.error('Quiz Questions Fetch Error:', state.error);
      })
      .addCase(startGroupQuiz.fulfilled, (state, action) => {
        state.questions = action.payload.questions;
        state.currentQuestionIndex = 0;
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
  updateScore,
  nextQuestion,
  incrementQuestionIndex,
  resetQuiz,
  startMigration,
  completeMigration,
  failMigration,
  rollbackMigration,
  setGuestSession,
  setSavedSessionId,
} = quizSlice.actions;

export default quizSlice.reducer;
