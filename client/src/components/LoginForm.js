import React, { useState } from 'react';
import axios from '../api';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/login', { email, password });
      // Handle successful login, e.g., store token, redirect, etc.
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Render login form fields */}
    </form>
  );
};

export default LoginForm; 