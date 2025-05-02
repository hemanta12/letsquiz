import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { QuizSettings, GroupQuizSession, GroupPlayer } from '../../types/quiz.types';
import { Player } from '../../types/group.types';
import QuizService from '../../services/quizService';
import { FetchQuestionsRequest, Question, FetchQuestionsResponse } from '../../types/api.types';

interface QuizState {
  settings: QuizSettings;
  mode: string;
  category: string;
  difficulty: string;
  currentQuestion: number;
  questions: Question[];
  selectedAnswers: Record<number, string>;
  score: number;
  currentPlayer?: Player;
  pointsPerQuestion: number;
  loading: boolean;
  error: string | null;
  isGroupMode: boolean;
  groupSession: GroupQuizSession | null;
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
  currentPlayer: undefined,
  pointsPerQuestion: 5,
  loading: false,
  error: null,
  isGroupMode: false,
  groupSession: null,
};

// Async thunk for fetching quiz questions
export const fetchQuizQuestions = createAsyncThunk<
  FetchQuestionsResponse,
  FetchQuestionsRequest,
  { rejectValue: string }
>('quiz/fetchQuizQuestions', async (params: FetchQuestionsRequest, { rejectWithValue }) => {
  try {
    const response = await QuizService.fetchQuestions(params);
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || error.message);
  }
});

export const startGroupQuiz = createAsyncThunk(
  'quiz/startGroupQuiz',
  async (
    {
      players,
      category,
      difficulty,
    }: {
      players: string[];
      category: string;
      difficulty: string;
    },
    { dispatch }
  ) => {
    const session = await QuizService.createGroupSession(players, category, difficulty);
    const { questions } = await QuizService.fetchQuestions({ category, difficulty });
    return { session, questions };
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
    // setCurrentPlayer reducer
    setCurrentPlayer: (state, action: PayloadAction<Player>) => {
      state.currentPlayer = action.payload;
    },
    // updatePlayerScore
    updatePlayerScore: (state, action: PayloadAction<string>) => {
      if (state.settings?.groupState) {
        state.settings.groupState.players = state.settings.groupState.players.map((player) => {
          if (player.id === action.payload) {
            return {
              ...player,
              score: player.score + 5,
              uiScore: undefined,
            };
          }
          return {
            ...player,
            uiScore: undefined,
          };
        });
      }
    },
    // updatePlayers reducer
    updatePlayers: (state, action: PayloadAction<Player[]>) => {
      if (state.settings?.groupState) {
        state.settings.groupState.players = action.payload;
      }
    },
    // updateTempScores reducer
    updateTempScores: (state, action: PayloadAction<Player[]>) => {
      if (state.settings?.groupState) {
        state.settings.groupState.players = action.payload;
      }
    },
    setGroupMode: (state, action: PayloadAction<boolean>) => {
      state.isGroupMode = action.payload;
    },
    nextPlayer: (state) => {
      if (!state.groupSession) return;
      const currentIndex = state.groupSession.players.findIndex(
        (p) => p.id === state.groupSession?.currentPlayer
      );
      const nextIndex = (currentIndex + 1) % state.groupSession.players.length;
      state.groupSession.currentPlayer = state.groupSession.players[nextIndex].id;
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
          state.questions = action.payload.questions;
          state.error = null;
          state.currentQuestion = 0;
          state.selectedAnswers = {};
          state.score = 0;
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
        state.groupSession = action.payload.session;
        state.currentQuestion = 0;
      });
  },
});

export const {
  setQuizSettings,
  selectAnswer,
  updateScore,
  nextQuestion,
  resetQuiz,
  setCurrentPlayer,
  updatePlayerScore,
  updatePlayers,
  updateTempScores,
  setGroupMode,
  nextPlayer,
} = quizSlice.actions;
export default quizSlice.reducer;
