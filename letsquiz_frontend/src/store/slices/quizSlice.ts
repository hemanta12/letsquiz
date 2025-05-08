import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { QuizSettings } from '../../types/quiz.types';
import QuizService from '../../services/quizService';
import { FetchQuestionsRequest, Question, FetchQuestionsResponse } from '../../types/api.types';
import { setGroupSession, setGroupMode, setCurrentPlayer } from './groupQuizSlice';

interface QuizState {
  settings: QuizSettings;
  mode: string;
  category: string;
  difficulty: string;
  currentQuestion: number;
  questions: Question[];
  selectedAnswers: Record<number, string>;
  score: number;
  pointsPerQuestion: number;
  loading: boolean;
  error: string | null;
}

const initialState: QuizState = {
  settings: {
    mode: 'Solo',
    category: '',
    difficulty: '',
  },
  mode: 'Solo',
  category: '',
  difficulty: '',
  currentQuestion: 0,
  questions: [],
  selectedAnswers: {},
  score: 0,
  pointsPerQuestion: 5,
  loading: false,
  error: null,
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
    return response;
  } catch (error: any) {
    console.error('fetchQuizQuestions thunk - error:', error);
    return rejectWithValue(error.response?.data?.detail || error.message);
  }
});

export const startGroupQuiz = createAsyncThunk<
  { questions: Question[] },
  { players: string[]; category: string; difficulty: string },
  { rejectValue: string }
>(
  'quiz/startGroupQuiz',
  async ({ players, category, difficulty }, { dispatch, rejectWithValue }) => {
    try {
      const session = await QuizService.createGroupSession(players, category, difficulty);
      dispatch(setGroupSession(session));
      dispatch(setGroupMode(true));
      // Assuming the first player in the session is the starting player
      if (session.players.length > 0) {
        dispatch(setCurrentPlayer(session.players[0]));
      }
      const { questions } = await QuizService.fetchQuestions({ category, difficulty });
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
      state.difficulty = action.payload.difficulty;
    },
    // selectAnswer reducer
    selectAnswer: (state, action: PayloadAction<{ questionIndex: number; answer: string }>) => {
      state.selectedAnswers[action.payload.questionIndex] = action.payload.answer;
    },
    // updateScore reducer
    updateScore: (state) => {
      state.score = Object.entries(state.selectedAnswers).reduce((score, [index, answer]) => {
        return score + (answer === state.questions[Number(index)].correct_answer ? 1 : 0);
      }, 0);
    },
    // nextQuestion reducer
    nextQuestion: (state, action: PayloadAction<Question | undefined>) => {
      if (action.payload) {
        // Add the preloaded question to the questions array
        state.questions.push(action.payload);
      }
      if (state.currentQuestion < state.questions.length - 1) {
        state.currentQuestion += 1;
      }
    },
    // resetQuiz reducer
    resetQuiz: () => initialState,
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
          state.currentQuestion = 0;
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
        state.error = action.payload as string;
        state.currentQuestion = 0;
        state.selectedAnswers = {};
        state.score = 0;
      })
      .addCase(startGroupQuiz.fulfilled, (state, action) => {
        state.questions = action.payload.questions;
        state.currentQuestion = 0;
      });
  },
});

export const { setQuizSettings, selectAnswer, updateScore, nextQuestion, resetQuiz } =
  quizSlice.actions;
export default quizSlice.reducer;
