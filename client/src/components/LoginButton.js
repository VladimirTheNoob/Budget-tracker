import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LoginButton = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('http://localhost:5000/auth/status', { withCredentials: true });
      setIsAuthenticated(response.data.authenticated);
      setUser(response.data.user);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const handleLogin = () => {
    // Redirect to Google OAuth login
    window.location.href = 'http://localhost:5000/auth/google';
  };

  if (isAuthenticated && user) {
    // Safely render user name
    const userName = user.displayName || 
      (user.name && `${user.name.givenName} ${user.name.familyName}`.trim()) || 
      'User';

    return (
      <div className="flex items-center">
        <img
          src={user.photos?.[0]?.value || user.picture || 'https://via.placeholder.com/32'}
          alt="Profile"
          className="w-8 h-8 rounded-full mr-2"
        />
        <span className="text-sm text-gray-700">{userName}</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
    >
      <svg
        className="w-5 h-5 mr-2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#ffffff"
          d="M12.545,12.151L12.545,12.151c0,1.054,0.855,1.909,1.909,1.909h3.536c-0.607,1.972-2.101,3.467-4.073,4.073v-2.909 c0-1.054-0.855-1.909-1.909-1.909h-3.536c0.607-1.972,2.101-3.467,4.073-4.073v2.909L12.545,12.151z M12,2C6.477,2,2,6.477,2,12 c0,5.523,4.477,10,10,10s10-4.477,10-10C22,6.477,17.523,2,12,2z M12,20c-4.418,0-8-3.582-8-8s3.582-8,8-8s8,3.582,8,8 S16.418,20,12,20z"
        />
      </svg>
      Sign in with Google
    </button>
  );
};

export default LoginButton; 