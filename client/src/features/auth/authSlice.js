import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    role: null,
    status: 'idle',
    error: null,
  },
  reducers: {
    setRole: (state, action) => {
      state.role = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase('auth/statusReceived', (state, action) => {
        console.log('AuthSlice - Status Received:', action.payload);
        const { user, role } = action.payload;
        state.user = user;
        state.role = role;
        state.status = 'succeeded';
      });
  },
});

export const { 
  setRole,
} = authSlice.actions;

export default authSlice.reducer; 