import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer from './slices/authSlice';
import quizReducer from './slices/quizSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    quiz: quizReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: true,
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

setupListeners(store.getState);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
