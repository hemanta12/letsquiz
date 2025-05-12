import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';

interface FeedbackState {
  show: boolean;
  isCorrect: boolean;
  duration?: number;
}

interface UIState {
  isLoading: boolean;
  error: string | null;
  modals: {
    quitQuiz: boolean;
    shareError: boolean;
    upgradePrompt: boolean;
    questionLimit: boolean;
  };
  feedback: FeedbackState;
  sharing: {
    isSharing: boolean;
    error: string | null;
  };
}

const initialState: UIState = {
  isLoading: false,
  error: null,
  modals: {
    quitQuiz: false,
    shareError: false,
    upgradePrompt: false,
    questionLimit: false,
  },
  feedback: {
    show: false,
    isCorrect: false,
  },
  sharing: {
    isSharing: false,
    error: null,
  },
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setModal: (
      state,
      action: PayloadAction<{ type: keyof UIState['modals']; isOpen: boolean }>
    ) => {
      state.modals[action.payload.type] = action.payload.isOpen;
    },
    setFeedback: (
      state,
      action: PayloadAction<{ show: boolean; isCorrect: boolean; duration?: number }>
    ) => {
      state.feedback = action.payload;
    },
    setSharingState: (
      state,
      action: PayloadAction<{ isSharing: boolean; error?: string | null }>
    ) => {
      state.sharing = {
        isSharing: action.payload.isSharing,
        error: action.payload.error || null,
      };
    },
    resetUI: () => initialState,
  },
});

export const { setLoading, setError, setModal, setFeedback, setSharingState, resetUI } =
  uiSlice.actions;

// Selectors
export const selectUI = (state: RootState) => state.ui;
export const selectLoading = (state: RootState) => state.ui.isLoading;
export const selectError = (state: RootState) => state.ui.error;
export const selectModals = (state: RootState) => state.ui.modals;
export const selectFeedback = (state: RootState) => state.ui.feedback;
export const selectSharing = (state: RootState) => state.ui.sharing;

export default uiSlice.reducer;
