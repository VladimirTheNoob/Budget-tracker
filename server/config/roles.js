// Roles and Permissions Configuration
const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager', 
  EMPLOYEE: 'employee'
};

const PERMISSIONS = {
  NONE: 'none',
  READ: 'read',
  WRITE: 'write'
};

const ROLE_PERMISSIONS = {
  'admin': {
    tasks: PERMISSIONS.WRITE,
    employees: PERMISSIONS.WRITE,
    notifications: PERMISSIONS.WRITE,
    roles: PERMISSIONS.WRITE,
    goals: PERMISSIONS.WRITE
  },
  [ROLES.MANAGER]: {
    tasks: PERMISSIONS.READ,
    employees: PERMISSIONS.READ,
    notifications: PERMISSIONS.READ,
    roles: PERMISSIONS.NONE,
    goals: PERMISSIONS.WRITE
  },
  [ROLES.EMPLOYEE]: {
    tasks: PERMISSIONS.READ,
    employees: PERMISSIONS.READ,
    notifications: PERMISSIONS.NONE,
    roles: PERMISSIONS.NONE,
    goals: PERMISSIONS.READ
  }
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS
}; 