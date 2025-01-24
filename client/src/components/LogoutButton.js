import React, { useState } from 'react';
import axios from 'axios';

const LogoutButton = ({ onLogout }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      console.log('Attempting to logout...');

      // Make the server request to the correct endpoint
      const response = await axios.post('http://localhost:5000/auth/logout', {}, { 
        withCredentials: true 
      });
      console.log('Server logout response:', response.data);

      // Call the parent's onLogout handler to update app state
      if (onLogout) {
        await onLogout();
      }

      // Clear local storage and session storage
      localStorage.clear();
      sessionStorage.clear();

      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
      
      // Even on error, clear everything
      if (onLogout) {
        await onLogout();
      }
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
        isLoading 
          ? 'bg-gray-400 cursor-not-allowed' 
          : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
      }`}
    >
      {isLoading ? 'Signing out...' : 'Sign Out'}
    </button>
  );
};

export default LogoutButton; 