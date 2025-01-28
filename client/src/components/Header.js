import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROLES } from '../config/roles';
import LogoutButton from './LogoutButton';

const Header = () => {
  const { user, role: userRole } = useSelector(state => state.auth);

  const navigationLinks = [
    { 
      name: 'Tasks', 
      path: '/tasks', 
      roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] 
    },
    { 
      name: 'Task Input', 
      path: '/tasks/input', 
      roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] 
    },
    { 
      name: 'Goals', 
      path: '/goals', 
      roles: [ROLES.ADMIN, ROLES.MANAGER] 
    },
    { 
      name: 'Goal Input', 
      path: '/goals/input', 
      roles: [ROLES.ADMIN, ROLES.MANAGER] 
    },
    { 
      name: 'Role Management', 
      path: '/admin/roles', 
      roles: [ROLES.ADMIN] 
    }
  ];

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <nav className="flex space-x-4">
            {navigationLinks
              .filter(link => link.roles.includes(userRole))
              .map(link => (
                <Link 
                  key={link.path} 
                  to={link.path} 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {link.name}
                </Link>
              ))
            }
          </nav>
          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-sm text-gray-600">
                Welcome, {user.displayName || user.emails?.[0]?.value || 'User'}
              </span>
            )}
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 
