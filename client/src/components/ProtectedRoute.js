import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { ROLES } from '../config/roles';

const ProtectedRoute = ({ children, allowedRoles = ['admin', 'manager', 'employee'] }) => {
  const { isAuthenticated, userRole } = useSelector((state) => state.auth);

  useEffect(() => {
    console.log('ProtectedRoute - isAuthenticated:', isAuthenticated);
    console.log('ProtectedRoute - role:', userRole);
    console.log('ProtectedRoute - allowedRoles:', allowedRoles);
  }, [isAuthenticated, userRole, allowedRoles]);

  // Not authenticated
  if (!isAuthenticated) {
    toast.error('Please log in to access this page', {
      position: 'top-center',
      duration: 3000
    });
    return <Navigate to="/login" replace />;
  }

  // Undefined role handling
  if (!userRole) {
    toast.error('Unable to determine user role. Please log out and log in again.', {
      position: 'top-center',
      duration: 4000
    });
    return <Navigate to="/login" replace />;
  }

  // Admin gets full access
  if (userRole === ROLES.ADMIN) {
    return children;
  }

  // Role-based access control
  const hasRequiredRole = allowedRoles.includes(userRole);
  
  if (!hasRequiredRole) {
    toast.error('You do not have permission to access this page', {
      position: 'top-center',
      duration: 3000
    });
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
