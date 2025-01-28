// Roles and Permissions Configuration
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager', 
  EMPLOYEE: 'employee'
};

export const PERMISSIONS = {
  NONE: 'none',
  READ: 'read',
  WRITE: 'write'
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
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