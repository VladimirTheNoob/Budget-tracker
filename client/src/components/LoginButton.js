import React from 'react';

const LoginButton = ({ className }) => {
  const handleLogin = () => {
    window.location.href = 'http://localhost:5000/auth/google';
  };

  return (
    <button
      onClick={handleLogin}
      className={className || "flex items-center gap-2 bg-white text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow hover:bg-gray-100"}
    >
      <img 
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
        alt="Google Logo" 
        className="w-5 h-5"
      />
      Sign in with Google
    </button>
  );
};

export default LoginButton; 