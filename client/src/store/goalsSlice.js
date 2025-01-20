import { createSlice } from '@reduxjs/toolkit';

const goalsSlice = createSlice({
  name: 'goals',
  initialState: [],
  reducers: {
    setGoals: (state, action) => {
      return action.payload;
    },
    // Define other reducers as needed
  },
});

export const { setGoals } = goalsSlice.actions;

export default goalsSlice.reducer; 