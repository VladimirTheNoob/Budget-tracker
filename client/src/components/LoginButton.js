import React from 'react';

const LoginButton = ({ className }) => {
  const handleLogin = () => {
    window.location.href = 'http://localhost:5000/auth/google';
  };

  return (
    <div className="flex justify-center items-center h-[80vh]">
      <button
        onClick={handleLogin}
        className={className || `
          flex items-center gap-4 
          bg-white text-gray-800 
          font-semibold 
          py-4 px-8 
          border border-gray-400 
          rounded-lg shadow-lg 
          hover:bg-gray-100 
          text-xl 
          transform transition-transform 
          hover:scale-105 
        `}
      >
        <img 
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
          alt="Google Logo" 
          className="w-8 h-8"
        />
        Sign in with Google
      </button>
    </div>
  );
};

export default LoginButton; 