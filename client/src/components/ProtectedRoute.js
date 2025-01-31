import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { ROLES } from '../config/roles';

const ProtectedRoute = ({ children, allowedRoles = ['admin', 'manager', 'employee'] }) => {
  const { isAuthenticated, userRole } = useSelector((state) => state.auth);

  useEffect(() => {
    console.log('ProtectedRoute - Authentication Details:', {
      isAuthenticated,
      userRole: typeof userRole === 'object' ? JSON.stringify(userRole) : userRole,
      allowedRoles
    });
  }, [isAuthenticated, userRole, allowedRoles]);

  // Not authenticated
  if (!isAuthenticated) {
    toast.error('Please log in to access this page', {
      position: 'top-center',
      duration: 3000
    });
    return <Navigate to="/login" replace />;
  }

  // Robust role handling
  const currentUserRole = typeof userRole === 'object' 
    ? (userRole.role || userRole.name || 'guest') 
    : userRole || 'guest';

  console.log('ProtectedRoute - Processed Role:', currentUserRole);

  // Admin gets full access
  if (currentUserRole === ROLES.ADMIN) {
    return children;
  }

  // Role-based access control
  const hasRequiredRole = allowedRoles.includes(currentUserRole.toLowerCase());
  
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
