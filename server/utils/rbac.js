const fs = require('fs');
const path = require('path');
const { ROLES, PERMISSIONS, ROLE_PERMISSIONS } = require('../config/roles');

const ROLES_FILE = path.join(__dirname, '../storage/user-roles.json');

// Ensure roles file exists
const ensureRolesFileExists = () => {
  if (!fs.existsSync(ROLES_FILE)) {
    fs.writeFileSync(ROLES_FILE, JSON.stringify([], null, 2));
  }
};

// Read user roles
const readUserRoles = () => {
  ensureRolesFileExists();
  try {
    const data = fs.readFileSync(ROLES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading user roles:', error);
    return [];
  }
};

// Write user roles
const writeUserRoles = (userRoles) => {
  try {
    fs.writeFileSync(ROLES_FILE, JSON.stringify(userRoles, null, 2));
  } catch (error) {
    console.error('Error writing user roles:', error);
  }
};

// Get user role
const getUserRole = (email) => {
  const userRoles = readUserRoles();
  const userRole = userRoles.find(ur => ur.email.toLowerCase() === email.toLowerCase());
  return userRole ? userRole.role : ROLES.EMPLOYEE;
};

// Set user role
const setUserRole = (email, role) => {
  const userRoles = readUserRoles();
  const existingUserIndex = userRoles.findIndex(
    ur => ur.email.toLowerCase() === email.toLowerCase()
  );

  if (existingUserIndex !== -1) {
    userRoles[existingUserIndex].role = role;
  } else {
    userRoles.push({ email: email.toLowerCase(), role });
  }

  writeUserRoles(userRoles);
};

// Check permission middleware
const checkPermission = (resource, requiredPermissionType = 'read') => {
  return (req, res, next) => {
    // If not authenticated, deny access
    if (!req.isAuthenticated()) {
      console.warn('Unauthorized: Not authenticated');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userEmail = req.user.emails?.[0]?.value || req.user.email;
    console.log('Checking Permission:', {
      resource,
      userEmail,
      method: req.method,
      requiredPermissionType
    });

    const userRole = getUserRole(userEmail);
    console.log('User Role:', userRole);

    const userPermission = ROLE_PERMISSIONS[userRole]?.[resource];
    console.log('User Permission:', userPermission);

    // Check if user has the required permission
    const hasPermission = 
      userPermission === PERMISSIONS.WRITE || 
      (requiredPermissionType === 'read' && userPermission === PERMISSIONS.READ);

    if (!hasPermission) {
      console.warn('Permission Denied', {
        userRole,
        resource,
        requiredPermissionType,
        userPermission
      });
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'You do not have permission to access this resource' 
      });
    }

    next();
  };
};

module.exports = {
  ROLES,
  PERMISSIONS,
  getUserRole,
  setUserRole,
  checkPermission
}; 