import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ROLES } from '../config/roles';

const AdminRoleManager = ({ currentUserRole }) => {
  const [userRoles, setUserRoles] = useState([]);
  const [newRole, setNewRole] = useState({
    email: '',
    role: ROLES.EMPLOYEE
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check current user's role
    const checkUserRole = async () => {
      try {
        const response = await axios.get('http://localhost:5000/auth/status', { 
          withCredentials: true 
        });
        
        console.log('Admin Role Manager - Auth Status:', {
          authenticated: response.data.authenticated,
          role: response.data.role,
          user: response.data.user,
          passedRole: currentUserRole
        });
        
        // Determine the role to use
        const resolvedRole = currentUserRole || 
          response.data.role || 
          (response.data.user?.email === 'belyakovvladimirs@gmail.com' ? ROLES.ADMIN : ROLES.EMPLOYEE);
        
        console.log('Resolved Role:', resolvedRole);
        
        // Only fetch roles if user is an admin
        if (resolvedRole === ROLES.ADMIN) {
          console.log('Fetching user roles for admin');
          fetchUserRoles();
        } else {
          console.log('Not an admin, cannot fetch roles');
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setError('Failed to check user role');
      }
    };

    checkUserRole();
  }, [currentUserRole]);

  const fetchUserRoles = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/roles', { 
        withCredentials: true 
      });
      setUserRoles(response.data);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setError('Failed to fetch user roles');
    }
  };

  const handleRoleUpdate = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.put(
        'http://localhost:5000/api/roles', 
        newRole, 
        { withCredentials: true }
      );

      // Update local state
      const updatedRoles = [...userRoles];
      const existingRoleIndex = updatedRoles.findIndex(
        ur => ur.email.toLowerCase() === newRole.email.toLowerCase()
      );

      if (existingRoleIndex !== -1) {
        updatedRoles[existingRoleIndex].role = newRole.role;
      } else {
        updatedRoles.push(newRole);
      }

      setUserRoles(updatedRoles);
      
      // Reset form
      setNewRole({
        email: '',
        role: ROLES.EMPLOYEE
      });

      alert('Role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      setError(error.response?.data?.error || 'Failed to update role');
    }
  };

  // Prevent non-admin access
  if (currentUserRole !== ROLES.ADMIN) {
    return (
      <div className="p-4 text-center text-red-600">
        Access Denied: Administrator privileges required
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-[#f5f5f5]">
      <div className="max-w-2xl mx-auto bg-white rounded p-6 shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Role Management</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            {error}
          </div>
        )}

        {/* Role Assignment Form */}
        <form onSubmit={handleRoleUpdate} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-2">
              User Email
            </label>
            <input
              type="email"
              id="email"
              value={newRole.email}
              onChange={(e) => setNewRole(prev => ({ ...prev, email: e.target.value }))}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-gray-400"
              placeholder="Enter user email"
              required
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-gray-700 text-sm font-medium mb-2">
              Role
            </label>
            <select
              id="role"
              value={newRole.role}
              onChange={(e) => setNewRole(prev => ({ ...prev, role: e.target.value }))}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-gray-400"
              required
            >
              {Object.values(ROLES).map(role => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              className="w-48 bg-black hover:bg-gray-800 text-white font-medium py-2 px-6 rounded"
            >
              Update Role
            </button>
          </div>
        </form>

        {/* User Roles List */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Current User Roles</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userRoles.map((userRole, index) => (
                  <tr key={`${userRole.email}-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {userRole.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        userRole.role === ROLES.ADMIN 
                          ? 'bg-red-100 text-red-800' 
                          : userRole.role === ROLES.MANAGER 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {userRole.role.charAt(0).toUpperCase() + userRole.role.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRoleManager; 