import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { GroupQuizSession, GroupPlayer } from '../../types/quiz.types';

interface GroupQuizState {
  isGroupMode: boolean;
  groupSession: GroupQuizSession | null;
  currentPlayer?: GroupPlayer;
  loading: boolean;
  error: string | null;
  sessionTimeoutId?: NodeJS.Timeout;
}

const initialState: GroupQuizState = {
  isGroupMode: false,
  groupSession: null,
  currentPlayer: undefined,
  loading: false,
  error: null,
  sessionTimeoutId: undefined,
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
            // Handle session timeout
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

        // Update session activity timestamps
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
    // Add loading and error reducers for potential thunks in this slice
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
  },
  extraReducers: (builder) => {
    // Add extraReducers for any async thunks defined in this slice later
  },
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
} = groupQuizSlice.actions;

export default groupQuizSlice.reducer;
