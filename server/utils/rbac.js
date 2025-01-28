const fs = require('fs');
const path = require('path');
const { ROLES, PERMISSIONS, ROLE_PERMISSIONS } = require('../config/roles');

const ROLES_FILE = path.join(__dirname, '../storage/user-roles.json');
const EMPLOYEES_FILE = path.join(__dirname, '../storage/employees.json');

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
const getUserRole = (employeeId, email) => {
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
    console.log('getUserRole - Hardcoded Admin Email Detected');
    
    // Ensure the admin role is set in user-roles.json
    const employees = JSON.parse(fs.readFileSync(EMPLOYEES_FILE, 'utf8'));
    const employee = employees.find(emp => emp.email === processedEmail);
    
    if (employee) {
      const userRoles = readUserRoles();
      
      // Remove any existing roles for this employee
      const filteredRoles = userRoles.filter(ur => ur.employeeId !== employee.id);
      
      // Add admin role
      const adminRole = { employeeId: employee.id, role: ROLES.ADMIN };
      filteredRoles.push(adminRole);
      
      console.log('getUserRole - Forcefully Setting Admin Role:', {
        email: processedEmail,
        employeeId: employee.id,
        newRoles: filteredRoles
      });
      
      writeUserRoles(filteredRoles);
      
      return ROLES.ADMIN;
    }
  }

  const userRoles = readUserRoles();
  const userRolesForEmployee = userRoles.filter(ur => ur.employeeId === employeeId);

  console.log('getUserRole - User Roles for Employee:', {
    employeeId,
    email: processedEmail,
    roles: userRolesForEmployee
  });

  // Prioritize roles: ADMIN > MANAGER > EMPLOYEE
  const hasAdminRole = userRolesForEmployee.some(ur => ur.role === ROLES.ADMIN);
  const hasManagerRole = userRolesForEmployee.some(ur => ur.role === ROLES.MANAGER);

  console.log('getUserRole - Role Check:', {
    hasAdminRole,
    hasManagerRole
  });

  if (hasAdminRole) return ROLES.ADMIN;
  if (hasManagerRole) return ROLES.MANAGER;

  // If no specific role found, default to EMPLOYEE
  return ROLES.EMPLOYEE;
};

// Set user role
const setUserRole = (employeeId, role) => {
  const userRoles = readUserRoles();
  
  // Remove any existing roles for this employeeId
  const filteredRoles = userRoles.filter(ur => ur.employeeId !== employeeId);
  
  // Add the new role
  filteredRoles.push({ employeeId, role });

  console.log('Setting User Role:', {
    employeeId,
    role,
    existingRoles: userRoles,
    newRoles: filteredRoles
  });

  writeUserRoles(filteredRoles);
};

// Ensure admin role for specific email
const ensureAdminRole = (email) => {
  if (email?.toLowerCase() === 'belyakovvladimirs@gmail.com') {
    const employees = JSON.parse(fs.readFileSync(EMPLOYEES_FILE, 'utf8'));
    const employee = employees.find(emp => emp.email === email);
    
    if (employee) {
      const userRoles = readUserRoles();
      const filteredRoles = userRoles.filter(ur => ur.employeeId !== employee.id);
      filteredRoles.push({ employeeId: employee.id, role: ROLES.ADMIN });
      
      console.log('Ensuring Admin Role:', {
        email,
        employeeId: employee.id,
        newRoles: filteredRoles
      });
      
      writeUserRoles(filteredRoles);
    }
  }
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

    const employeeId = getEmployeeIdByEmail(userEmail);
    const userRole = getUserRole(employeeId, userEmail);
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

// Get employee ID by email
const getEmployeeIdByEmail = (email) => {
  const employees = JSON.parse(fs.readFileSync(EMPLOYEES_FILE, 'utf8'));
  const employee = employees.find(emp => emp.email === email);
  return employee ? employee.id : null;
};

const rolePermissions = {
  [ROLES.ADMIN]: {
    roles: 'full',
    employees: 'full',
    tasks: 'full'
  },
  [ROLES.MANAGER]: {
    tasks: 'write',
    employees: 'read'
  },
  [ROLES.EMPLOYEE]: {
    tasks: 'read'
  }
};

module.exports = {
  ROLES,
  PERMISSIONS,
  getUserRole,
  setUserRole,
  checkPermission,
  getEmployeeIdByEmail
}; 