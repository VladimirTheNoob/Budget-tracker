import React from 'react';
import { Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ element: Component, roles, ...rest }) => {
  const isAuthenticated = useSelector((state) => state.auth.user !== null);
  const userRole = useSelector((state) => state.auth.role);

  console.log('ProtectedRoute - Authentication Details:', {
    isAuthenticated,
    userRole,
    requiredRoles: roles,
  });

  return (
    <Route
      {...rest}
      element={
        isAuthenticated ? (
          roles.includes(userRole) ? (
            <Component />
          ) : (
            <Navigate to="/unauthorized" replace />
          )
        ) : (
          <Navigate to="/login" replace />
        )
      }
    />
  );
};

export default ProtectedRoute; 