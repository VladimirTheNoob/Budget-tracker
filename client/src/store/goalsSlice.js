import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks
export const fetchGoals = createAsyncThunk(
  'goals/fetchGoals',
  async () => {
    const response = await axios.get('http://localhost:5000/api/goals', { withCredentials: true });
    return response.data;
  }
);

export const saveGoals = createAsyncThunk(
  'goals/saveGoals',
  async (goals) => {
    const response = await axios.post('http://localhost:5000/api/goals', goals, { withCredentials: true });
    return response.data;
  }
);

const goalsSlice = createSlice({
  name: 'goals',
  initialState: {
    data: {},
    status: 'idle',
    error: null
  },
  reducers: {
    updateGoal: (state, action) => {
      const { department, kpi, field, value } = action.payload;
      if (!state.data[department]) {
        state.data[department] = {};
      }
      if (!state.data[department][kpi]) {
        state.data[department][kpi] = {};
      }
      state.data[department][kpi][field] = value;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGoals.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchGoals.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(saveGoals.pending, (state) => {
        state.status = 'saving';
      })
      .addCase(saveGoals.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(saveGoals.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  }
});

export const { updateGoal } = goalsSlice.actions;

export default goalsSlice.reducer; 