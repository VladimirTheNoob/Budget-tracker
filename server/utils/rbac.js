const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { ROLES, PERMISSIONS, ROLE_PERMISSIONS } = require('../config/roles');

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'budget_tracker',
  password: process.env.POSTGRES_PASSWORD || '1111',
  port: process.env.POSTGRES_PORT || 5432,
});

// Get employee ID by email
const getEmployeeIdByEmail = async (email) => {
  try {
    const query = 'SELECT id FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    console.error('Error getting employee ID:', error);
    return null;
  }
};

// Get user role
const getUserRole = async (employeeId, email) => {
  try {
    console.log('getUserRole - Input:', { employeeId, email });

    // Robust email extraction
    const processedEmail = 
      email || 
      (typeof email === 'object' && email?.value) || 
      (Array.isArray(email) && email[0]?.value) || 
      null;

    console.log('getUserRole - Processed Email:', processedEmail);

    // Always return admin role for this specific email
    if (processedEmail?.toLowerCase() === 'belyakovvladimirs@gmail.com') {
      return ROLES.ADMIN;
    }

    // Query user role from database
    const query = 'SELECT role FROM users WHERE id = $1';
    const result = await pool.query(query, [employeeId]);

    if (result.rows.length === 0) {
      console.log('No user found with given ID');
      return ROLES.EMPLOYEE;
    }

    const userRole = result.rows[0].role;
    console.log('getUserRole - Returned Role:', userRole);

    return userRole || ROLES.EMPLOYEE;
  } catch (error) {
    console.error('Error getting user role:', error);
    return ROLES.EMPLOYEE;
  }
};

// Set user role
const setUserRole = async (employeeId, role) => {
  try {
    const query = 'UPDATE users SET role = $1 WHERE id = $2';
    await pool.query(query, [role, employeeId]);
    
    console.log('Setting User Role:', { employeeId, role });
  } catch (error) {
    console.error('Error setting user role:', error);
  }
};

// Check permission
const checkPermission = (resource, action = 'read') => {
  return async (req, res, next) => {
    try {
      const userEmail = req.user?.emails?.[0]?.value || req.user?.email;
      const employeeId = await getEmployeeIdByEmail(userEmail);
      const userRole = await getUserRole(employeeId, userEmail);

      // Determine permissions based on role
      const rolePermissions = ROLE_PERMISSIONS[userRole] || {};
      const resourcePermissions = rolePermissions[resource] || PERMISSIONS.NONE;

      // Check if the action is allowed
      const isAllowed = 
        resourcePermissions === PERMISSIONS.WRITE || 
        (action === 'read' && resourcePermissions !== PERMISSIONS.NONE);

      if (isAllowed) {
        return next();
      }

      return res.status(403).json({ 
        error: 'Access denied', 
        message: `Insufficient permissions for ${resource} ${action}` 
      });
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Internal server error during permission check' });
    }
  };
};

module.exports = {
  ROLES,
  PERMISSIONS,
  getUserRole,
  setUserRole,
  checkPermission,
  getEmployeeIdByEmail
}; 