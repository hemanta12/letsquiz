import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GroupQuizSession, GroupPlayer } from '../../types/quiz.types';

interface GroupQuizState {
  isGroupMode: boolean;
  groupSession: GroupQuizSession | null;
  currentPlayer?: GroupPlayer;
  loading: boolean;
  error: string | null;
  sessionTimeoutId?: NodeJS.Timeout;
  playerCorrectness: Record<number, number[]>;
}

const initialState: GroupQuizState = {
  isGroupMode: false,
  groupSession: null,
  currentPlayer: undefined,
  loading: false,
  error: null,
  sessionTimeoutId: undefined,
  playerCorrectness: {},
};

export const groupQuizSlice = createSlice({
  name: 'groupQuiz',
  initialState,
  reducers: {
    setGroupMode: (state, action: PayloadAction<boolean>) => {
      state.isGroupMode = action.payload;
    },
    setGroupSession: (state, action: PayloadAction<GroupQuizSession | null>) => {
      // Clear existing timeout if any
      if (state.sessionTimeoutId) {
        clearTimeout(state.sessionTimeoutId);
        state.sessionTimeoutId = undefined;
      }

      state.groupSession = action.payload;

      // Set new timeout if session exists
      if (action.payload) {
        const timeoutAt = new Date(action.payload.timeoutAt).getTime();
        const now = Date.now();
        const timeoutDuration = Math.max(0, timeoutAt - now);

        if (timeoutDuration > 0) {
          state.sessionTimeoutId = setTimeout(() => {
            state.groupSession = null;
            state.isGroupMode = false;
            state.error = 'Group session has timed out';
          }, timeoutDuration);
        }
      }
    },
    setCurrentPlayer: (state, action: PayloadAction<GroupPlayer | undefined>) => {
      state.currentPlayer = action.payload;
    },
    // Reducers for updating player scores and details within the group session
    updatePlayerScore: (state, action: PayloadAction<{ playerId: number; score: number }>) => {
      if (state.groupSession) {
        if (state.groupSession.players) {
          state.groupSession.players = state.groupSession.players.map((player) =>
            player.id === action.payload.playerId
              ? { ...player, score: player.score + action.payload.score }
              : player
          );
        }

        state.groupSession.lastActive = new Date().toISOString();
        state.groupSession.timeoutAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      }
    },
    // Reducer for setting temporary score for UI display
    setTempPlayerScore: (state, action: PayloadAction<{ playerId: number; tempScore: number }>) => {
      if (state.groupSession) {
        if (state.groupSession.players) {
          state.groupSession.players = state.groupSession.players.map((player) =>
            player.id === action.payload.playerId
              ? { ...player, uiScore: player.score + action.payload.tempScore }
              : { ...player, uiScore: undefined }
          );
        }
      }
    },
    // Reducer to reset temporary scores
    resetTempScores: (state) => {
      if (state.groupSession) {
        if (state.groupSession.players) {
          state.groupSession.players = state.groupSession.players.map((player) => ({
            ...player,
            uiScore: undefined,
          }));
        }
      }
    },
    updatePlayers: (state, action: PayloadAction<GroupPlayer[]>) => {
      if (state.groupSession) {
        if (state.groupSession.players) {
          state.groupSession.players = action.payload;
        }
      }
    },

    nextPlayer: (state) => {
      if (!state.groupSession) return;
      if (state.groupSession.players) {
        const currentIndex = state.groupSession.players.findIndex(
          (p) => p.id === state.groupSession?.currentPlayer
        );
        const nextIndex = (currentIndex + 1) % state.groupSession.players.length;
        state.groupSession.currentPlayer = state.groupSession.players[nextIndex].id;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetGroupQuiz: (state) => {
      // Clear timeout if exists
      if (state.sessionTimeoutId) {
        clearTimeout(state.sessionTimeoutId);
      }
      return initialState;
    },
    recordPlayerAnswer: (
      state,
      action: PayloadAction<{ playerId: number; questionIndex: number; answer: string }>
    ) => {
      if (state.groupSession) {
        const player = state.groupSession.players.find((p) => p.id === action.payload.playerId);
        if (player) {
          if (!player.answers) player.answers = [];

          while (player.answers.length <= action.payload.questionIndex) {
            player.answers.push('');
          }

          player.answers[action.payload.questionIndex] = action.payload.answer;
        }
      }
    },
    recordPlayerCorrectness: (
      state,
      action: PayloadAction<{ questionIndex: number; playerId: number }>
    ) => {
      const { questionIndex, playerId } = action.payload;
      if (!state.playerCorrectness[questionIndex]) {
        state.playerCorrectness[questionIndex] = [];
      }
      const currentPlayers = state.playerCorrectness[questionIndex];
      const playerIndex = currentPlayers.indexOf(playerId);
      if (playerIndex > -1) {
        state.playerCorrectness[questionIndex] = currentPlayers.filter((id) => id !== playerId);
      } else {
        state.playerCorrectness[questionIndex] = [...currentPlayers, playerId];
      }
    },
  },
  extraReducers: (builder) => {},
});

export const {
  setGroupMode,
  setGroupSession,
  setCurrentPlayer,
  updatePlayerScore,
  setTempPlayerScore,
  resetTempScores,
  updatePlayers,
  nextPlayer,
  setLoading,
  setError,
  resetGroupQuiz,
  recordPlayerAnswer,
  recordPlayerCorrectness,
} = groupQuizSlice.actions;

export default groupQuizSlice.reducer;
