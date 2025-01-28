import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ROLES } from '../config/roles';

const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  isAuthenticated = false, 
  userRole 
}) => {
  console.log('ProtectedRoute - isAuthenticated:', isAuthenticated);
  console.log('ProtectedRoute - role:', userRole);
  console.log('ProtectedRoute - allowedRoles:', allowedRoles);

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Normalize roles to ensure consistent comparison
  const normalizedUserRole = userRole?.toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());

  // Check if user's role is allowed
  const hasRequiredRole = normalizedAllowedRoles.length === 0 || 
    normalizedAllowedRoles.includes(normalizedUserRole);

  // If user doesn't have required role, show access denied
  if (!hasRequiredRole) {
    return (
      <div className="flex justify-center items-center h-full text-center text-red-600 p-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p>You do not have permission to access this page.</p>
          <p>Required Role: {allowedRoles.join(' or ')}</p>
          <p>Your Current Role: {userRole}</p>
        </div>
      </div>
    );
  }

  // If children are provided, render them
  if (children) {
    return children;
  }

  // Otherwise, render child routes
  return <Outlet />;
};

export default ProtectedRoute;
