import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { logout } from '../store/authSlice';
import { ROLES } from '../config/roles';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user, userRole } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout');
      dispatch(logout());
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-blue-600 text-white py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="text-2xl font-bold">
            Budget Tracker
          </Link>
          
          {isAuthenticated && (
            <nav className="ml-10 flex space-x-4">
              <Link 
                to="/tasks" 
                className="hover:bg-blue-700 px-3 py-2 rounded"
              >
                Tasks
              </Link>
              <Link 
                to="/tasks/input" 
                className="hover:bg-blue-700 px-3 py-2 rounded"
              >
                Task Input
              </Link>
              {[ROLES.ADMIN, ROLES.MANAGER].includes(userRole) && (
                <>
                  <Link 
                    to="/goals" 
                    className="hover:bg-blue-700 px-3 py-2 rounded"
                  >
                    Goals
                  </Link>
                  <Link 
                    to="/goals/input" 
                    className="hover:bg-blue-700 px-3 py-2 rounded"
                  >
                    Goal Input
                  </Link>
                </>
              )}
              {userRole === ROLES.ADMIN && (
                <Link 
                  to="/admin/roles" 
                  className="hover:bg-blue-700 px-3 py-2 rounded"
                >
                  Role Management
                </Link>
              )}
            </nav>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium">
                  Welcome, {user?.email || 'User'}
                </span>
                <span className="text-xs text-blue-200 capitalize">
                  Role: {userRole || 'Unknown'}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded text-sm"
              >
                Logout
              </button>
            </>
          ) : (
            <Link 
              to="/login" 
              className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 
