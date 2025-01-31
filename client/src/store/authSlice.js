import { createSlice } from '@reduxjs/toolkit';
import { ROLES } from '../config/roles';

const initialState = {
  isAuthenticated: false,
  user: null,
  userRole: null,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      const { user, authenticated, userRole } = action.payload;
      
      // Robust role assignment
      const processedRole = userRole 
        ? (typeof userRole === 'object' 
          ? (userRole.role || userRole.name || 'guest') 
          : userRole)
        : 'guest';

      console.log('AuthSlice - Login Success:', {
        user,
        authenticated,
        processedRole
      });

      state.isAuthenticated = authenticated;
      state.user = user;
      state.userRole = processedRole.toLowerCase();
      state.error = null;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.userRole = null;
      state.error = null;
    }
  }
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer; 