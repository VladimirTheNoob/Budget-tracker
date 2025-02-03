const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { ROLES, PERMISSIONS, ROLE_PERMISSIONS } = require('../config/roles');
const crypto = require('crypto');

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'budget_tracker',
  password: process.env.POSTGRES_PASSWORD || '1111',
  port: process.env.POSTGRES_PORT || 5432,
});

// Add this near the top of the file
const ADMIN_EMAILS = [
  'belyakovvladimirs@gmail.com',
  // Add other admin emails here
];

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

    // Multiple lookup strategies
    const lookupStrategies = [
      // 1. Direct ID lookup
      async () => {
        if (employeeId) {
          const idQuery = 'SELECT role FROM users WHERE id = $1';
          const idResult = await pool.query(idQuery, [employeeId]);
          return idResult.rows[0]?.role;
        }
        return null;
      },
      
      // 2. Email lookup
      async () => {
        if (processedEmail) {
          const emailQuery = 'SELECT role FROM users WHERE email = $1';
          const emailResult = await pool.query(emailQuery, [processedEmail]);
          return emailResult.rows[0]?.role;
        }
        return null;
      },
      
      // 3. Partial match strategies
      async () => {
        // If employeeId is a string, try partial matching
        if (typeof employeeId === 'string') {
          const numericPart = employeeId.replace(/[^0-9]/g, '');
          const partialQuery = `
            SELECT role 
            FROM users 
            WHERE id LIKE $1 OR email LIKE $2
          `;
          const partialResult = await pool.query(partialQuery, [
            `%${numericPart}%`, 
            `%${employeeId}%`
          ]);
          return partialResult.rows[0]?.role;
        }
        return null;
      }
    ];

    // Try lookup strategies
    let userRole;
    for (const strategy of lookupStrategies) {
      try {
        userRole = await strategy();
        if (userRole) break;
      } catch (strategyError) {
        console.warn('Role lookup strategy failed:', strategyError);
      }
    }

    // If no role found, default to employee
    if (!userRole) {
      console.log('No role found in database, defaulting to employee');
      return ROLES.EMPLOYEE;
    }

    console.log('Returning role from database:', userRole);
    return userRole;
  } catch (error) {
    console.error('Error getting user role:', error);
    return ROLES.EMPLOYEE;
  }
};

// Set user role
const setUserRole = async (employeeId, role) => {
  try {
    console.log('Setting User Role - Detailed Input:', { 
      employeeId, 
      role, 
      inputType: typeof employeeId 
    });

    // Validate inputs
    if (!employeeId || !role) {
      throw new Error('Invalid input: employeeId and role are required');
    }

    // Function to generate a consistent UUID from an ID
    const generateUUIDFromId = (id) => {
      // If it's already a valid UUID, return it
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return id;
      }

      // For old-style IDs, generate a consistent UUID
      // Extract the numeric part of the ID
      const numericPart = id.replace(/[^0-9]/g, '');
      return crypto.createHash('md5').update(numericPart).digest('hex');
    };

    // Lookup strategies
    const lookupStrategies = [
      // 1. Direct email lookup
      async () => {
        const emailQuery = 'SELECT id, email, role FROM users WHERE email = $1';
        const emailResult = await pool.query(emailQuery, [employeeId]);
        return emailResult.rows[0];
      },
      
      // 2. UUID generation from ID
      async () => {
        const uuid = generateUUIDFromId(employeeId);
        const uuidQuery = 'SELECT id, email, role FROM users WHERE id = $1';
        const uuidResult = await pool.query(uuidQuery, [uuid]);
        return uuidResult.rows[0];
      },
      
      // 3. Partial match on employee ID or email
      async () => {
        // Remove non-numeric characters and do a partial match
        const numericPart = employeeId.replace(/[^0-9]/g, '');
        const partialQuery = `
          SELECT id, email, role 
          FROM users 
          WHERE id LIKE $1 OR email LIKE $2
        `;
        const partialResult = await pool.query(partialQuery, [
          `%${numericPart}%`, 
          `%${employeeId}%`
        ]);
        return partialResult.rows[0];
      }
    ];

    // Try lookup strategies
    let userRecord;
    for (const strategy of lookupStrategies) {
      try {
        userRecord = await strategy();
        if (userRecord) break;
      } catch (strategyError) {
        console.warn('Lookup strategy failed:', strategyError);
      }
    }

    // If no user found, throw an error
    if (!userRecord) {
      console.warn('No user found with any identifier:', { employeeId });
      throw new Error(`User not found in database for ID: ${employeeId}`);
    }

    const { id: userId, email: userEmail } = userRecord;

    console.log('Found user:', { userId, userEmail });

    // Update role in database
    const updateQuery = 'UPDATE users SET role = $1 WHERE id = $2 RETURNING *';
    const updateResult = await pool.query(updateQuery, [role, userId]);
    
    console.log('Database Update Result:', {
      rowCount: updateResult.rowCount,
      updatedUser: updateResult.rows[0]
    });

    return { 
      success: true, 
      message: 'Role updated successfully',
      details: {
        employeeId,
        role,
        userId,
        userEmail
      }
    };
  } catch (error) {
    console.error('Comprehensive Error in setUserRole:', {
      message: error.message,
      stack: error.stack,
      employeeId,
      role
    });
    throw error;
  }
};

// Modify the checkPermission function
const checkPermission = (resource, action = 'read') => {
  return async (req, res, next) => {
    try {
      const userEmail = req.user?.emails?.[0]?.value || req.user?.email;
      const employeeId = await getEmployeeIdByEmail(userEmail);
      const userRole = await getUserRole(employeeId, userEmail);

      console.log('Permission Check Details:', {
        userEmail,
        employeeId,
        userRole,
        resource,
        action
      });

      // Special case for admin emails
      if (ADMIN_EMAILS.includes(userEmail)) {
        return next();
      }

      // Rest of the existing permission check logic remains the same
      const rolePermissions = ROLE_PERMISSIONS[userRole] || 
                               ROLE_PERMISSIONS[userRole.toLowerCase()] || {};
      
      const resourcePermissions = rolePermissions[resource] || PERMISSIONS.NONE;

      const isAllowed = 
        resourcePermissions === PERMISSIONS.WRITE || 
        (action === 'read' && resourcePermissions !== PERMISSIONS.NONE);

      if (isAllowed) {
        return next();
      }

      return res.status(403).json({ 
        error: 'Access denied', 
        message: `Insufficient permissions for ${resource} ${action}`,
        details: {
          userRole,
          resource,
          action,
          resourcePermissions
        }
      });
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Internal server error during permission check' });
    }
  }
}

module.exports = {
  ROLES,
  PERMISSIONS,
  getUserRole,
  setUserRole,
  checkPermission,
  getEmployeeIdByEmail
}; 