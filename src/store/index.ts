import { configureStore } from '@reduxjs/toolkit';

// Root reducer - will be expanded as we add more features
const reducer = {
  // Add reducers here as features grow
};

// Configure store with empty reducer for now
export const store = configureStore({
  reducer,
  // Add middleware or other configurations as needed
});

// Infer RootState and AppDispatch types from store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
