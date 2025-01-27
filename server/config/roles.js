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
  [ROLES.ADMIN]: {
    tasks: PERMISSIONS.WRITE,
    employees: PERMISSIONS.WRITE,
    notifications: PERMISSIONS.WRITE,
    roles: PERMISSIONS.WRITE
  },
  [ROLES.MANAGER]: {
    tasks: PERMISSIONS.READ,
    employees: PERMISSIONS.READ,
    notifications: PERMISSIONS.READ,
    roles: PERMISSIONS.NONE
  },
  [ROLES.EMPLOYEE]: {
    tasks: PERMISSIONS.READ,
    employees: PERMISSIONS.READ,
    notifications: PERMISSIONS.NONE,
    roles: PERMISSIONS.NONE
  }
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS
}; 