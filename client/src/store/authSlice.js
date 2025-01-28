import { createSlice } from '@reduxjs/toolkit';
import { ROLES } from '../config/roles';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    userRole: null
  },
  reducers: {
    loginSuccess: (state, action) => {
      const { user, authenticated, userRole } = action.payload;
      
      // Ensure email is extracted correctly
      const userEmail = user?.email || 
        user?.emails?.[0]?.value || 
        'Unknown Email';

      state.user = {
        ...user,
        email: userEmail
      };
      
      state.isAuthenticated = authenticated;
      
      // Explicitly set role, defaulting to 'employee' if not provided
      state.userRole = userRole || 
        (userEmail.toLowerCase() === 'belyakovvladimirs@gmail.com' 
          ? 'admin' 
          : 'employee');
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.userRole = null;
    }
  }
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer; 