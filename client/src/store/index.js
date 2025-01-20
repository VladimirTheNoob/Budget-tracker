import { configureStore } from '@reduxjs/toolkit';
import goalsReducer from './goalsSlice';

export const store = configureStore({
  reducer: {
    goals: goalsReducer,
    // Add other reducers as needed
  },
}); 