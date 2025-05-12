import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { QuizSettings } from '../../types/quiz.types';
import QuizService from '../../services/quizService';
import { FetchQuestionsRequest, Question, FetchQuestionsResponse } from '../../types/api.types';
import { setGroupSession, setGroupMode, setCurrentPlayer } from './groupQuizSlice';

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
}

const savedGuestProgress = localStorage.getItem('guestQuizProgress');
const savedGuestCount = localStorage.getItem('guestQuizCount');

const initialState: QuizState = {
  settings: {
    mode: 'Solo',
    category: '',
    categoryId: null,
    difficulty: '',
  },
  mode: 'Solo',
  category: '',
  categoryId: null,
  difficulty: '',
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
};

// Async thunk for fetching quiz questions
export const fetchQuizQuestions = createAsyncThunk<
  FetchQuestionsResponse,
  FetchQuestionsRequest,
  { rejectValue: string }
>('quiz/fetchQuizQuestions', async (params: FetchQuestionsRequest, { rejectWithValue }) => {
  try {
    const response = await QuizService.fetchQuestions(params);
    console.log('fetchQuizQuestions thunk - response:', response);

    // Validate response
    if (!response || !response.questions || response.questions.length === 0) {
      return rejectWithValue('No questions found for the selected criteria.');
    }

    return response;
  } catch (error: any) {
    console.error('fetchQuizQuestions thunk - error:', error);

    // Provide more detailed error messages
    if (error.response) {
      // Server responded with an error
      return rejectWithValue(
        error.response.data?.detail ||
          error.response.data?.message ||
          'Failed to fetch quiz questions'
      );
    } else if (error.request) {
      // Request was made but no response received
      return rejectWithValue('No response from server. Please check your network connection.');
    } else {
      // Something happened in setting up the request
      return rejectWithValue(
        error.message || 'An unexpected error occurred while fetching questions'
      );
    }
  }
});

export const startGroupQuiz = createAsyncThunk<
  { questions: Question[] },
  { players: string[]; categoryId: number | null | undefined; difficulty: string },
  { rejectValue: string }
>(
  'quiz/startGroupQuiz',
  async ({ players, categoryId, difficulty }, { dispatch, rejectWithValue }) => {
    try {
      const session = await QuizService.createGroupSession(players, '', difficulty);
      dispatch(setGroupSession(session));
      dispatch(setGroupMode(true));
      if (session.players.length > 0) {
        dispatch(setCurrentPlayer(session.players[0]));
      }
      const { questions } = await QuizService.fetchQuestions({ category: categoryId, difficulty });
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

      if (state.isGuestSession && state.guestQuizCount >= state.guestQuizLimit) {
        state.error = 'Guest quiz limit reached. Please sign up to continue.';
        return;
      }
    },

    startMigration: (state) => {
      // Create backup before starting migration
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
      // Clear guest data after successful migration
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
        // Restore from backup
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
} = quizSlice.actions;

export default quizSlice.reducer;
