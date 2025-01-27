import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  const currentUserRole = 'ADMIN'; // Replace with actual user role
  const ROLES = { ADMIN: 'ADMIN' }; // Replace with actual role constants

  return (
    <div>
      {/* Rest of the component content */}
      {currentUserRole === ROLES.ADMIN && (
        <Link to="/admin/roles" className="nav-link">
          Role Management
        </Link>
      )}
    </div>
  );
};

export default Header; 