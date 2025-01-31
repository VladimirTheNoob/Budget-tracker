import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ROLES } from '../config/roles';
import { Toaster, toast } from 'react-hot-toast';

const AdminRoleManager = ({ currentUserRole }) => {
  const [userRoles, setUserRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [newRole, setNewRole] = useState({
    employeeId: '',
    email: '',
    role: ROLES.EMPLOYEE
  });
  const [error, setError] = useState(null);
  const [authStatus, setAuthStatus] = useState(null);

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
          fetchEmployees();
        } else {
          console.log('Not an admin, cannot fetch roles');
        }

        setAuthStatus(response.data);
      } catch (error) {
        console.error('Error checking user role:', error);
        toast.error('Failed to check user role');
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
      toast.error('Failed to fetch user roles');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/employees', {
        withCredentials: true
      });
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    }
  };

  const handleEmployeeChange = (e) => {
    const employeeId = e.target.value;
    const selectedEmployee = employees.find(emp => emp.id === employeeId);
    setNewRole(prev => ({
      ...prev,
      employeeId,
      email: selectedEmployee?.email || ''
    }));
  };

  const handleRoleUpdate = async (e) => {
    e.preventDefault();
    
    try {
      const { employeeId, role } = newRole;
      
      console.log('Attempting to update role:', { employeeId, role });

      // Validate inputs
      if (!employeeId || !role) {
        toast.error('Please select an employee and a role');
        return;
      }

      // Extract user email safely
      const userEmail = 
        authStatus.user?.email || 
        authStatus.user?.emails?.[0]?.value || 
        null;

      console.log('User Email for Role Update:', userEmail);

      // Validate user email
      if (!userEmail) {
        toast.error('Cannot update role: User email is undefined');
        return;
      }

      // Find the employee in the list
      const employeeToUpdate = employees.find(emp => emp.id === employeeId);

      if (!employeeToUpdate) {
        toast.error('Employee not found');
        return;
      }

      // Prevent role change for specific email
      if (employeeToUpdate.email === 'belyakovvladimirs@gmail.com') {
        toast.error('Cannot change role for this user');
        return;
      }

      // Prepare role update payload
      const updatePayload = {
        employeeId: employeeId,
        role: role,
        email: employeeToUpdate.email
      };

      console.log('Role Update Payload:', updatePayload);

      // Make API call to update role
      const response = await axios.put(
        'http://localhost:5000/api/roles', 
        updatePayload, 
        { withCredentials: true }
      );

      console.log('Role Update Response:', response.data);

      // Refetch both roles and employees to ensure consistency
      const [rolesResponse, employeesResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/roles', { withCredentials: true }),
        axios.get('http://localhost:5000/api/employees', { withCredentials: true })
      ]);

      console.log('Refetched Roles:', rolesResponse.data);
      console.log('Refetched Employees:', employeesResponse.data);

      // Update state with latest data
      setUserRoles(rolesResponse.data);
      setEmployees(employeesResponse.data);

      // Reset form
      setNewRole({
        employeeId: '',
        email: '',
        role: ROLES.EMPLOYEE
      });

      // Show success notification
      toast.success(`Role updated to ${role} for ${employeeToUpdate.name}`);

    } catch (error) {
      console.error('Error updating role:', error);
      
      // Detailed error logging
      if (error.response) {
        // The request was made and the server responded with a status code
        console.error('Server Error Details:', error.response.data);
        toast.error(error.response.data.message || 'Failed to update role');
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        toast.error('No response from server');
      } else {
        // Something happened in setting up the request
        console.error('Error setting up request:', error.message);
        toast.error('Error updating role');
      }
    }
  };

  // Prevent non-admin access
  if (![ROLES.ADMIN].includes(currentUserRole)) {
    return (
      <div className="p-4 text-center text-red-600">
        Access Denied: Administrator privileges required
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-[#f5f5f5]">
      <Toaster 
        position="top-right" 
        toastOptions={{
          success: { duration: 3000 },
          error: { duration: 5000 }
        }} 
      />
      <div className="max-w-2xl mx-auto bg-white rounded p-6 shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Role Management</h2>

        {/* Role Assignment Form */}
        <form onSubmit={handleRoleUpdate} className="space-y-4">
          <div>
            <label htmlFor="employee" className="block text-gray-700 text-sm font-medium mb-2">
              Select Employee
            </label>
            <select
              id="employee"
              value={newRole.employeeId}
              onChange={handleEmployeeChange}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-gray-400"
              required
            >
              <option value="">Select an employee</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-2">
              User Email
            </label>
            <input
              type="email"
              id="email"
              value={newRole.email}
              readOnly
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-gray-400 bg-gray-100"
              placeholder="Employee email will appear here"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-gray-700 text-sm font-medium mb-2">
              Select Role
            </label>
            <select
              id="role"
              value={newRole.role}
              onChange={(e) => setNewRole(prev => ({ ...prev, role: e.target.value }))}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-gray-400"
              required
            >
              <option value={ROLES.EMPLOYEE}>Employee</option>
              <option value={ROLES.MANAGER}>Manager</option>
              <option value={ROLES.ADMIN}>Admin</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition duration-300"
          >
            Update Role
          </button>
        </form>

        {/* User Roles List */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Current User Roles</h3>
          {userRoles.length === 0 ? (
            <p className="text-center text-gray-500">No user roles found</p>
          ) : (
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">User Email</th>
                  <th className="border border-gray-300 p-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {userRoles.map((role, index) => {
                  // Find the employee corresponding to this role
                  const employee = employees.find(emp => 
                    emp.id === role.employeeId || 
                    emp.email === role.email
                  );
                  
                  // Add console log to debug role mapping
                  console.log('Role Mapping Debug:', {
                    roleEntry: role,
                    matchedEmployee: employee,
                    employeesList: employees
                  });

                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2">
                        {employee ? employee.email : role.email || 'Unknown Email'}
                      </td>
                      <td className="border border-gray-300 p-2">{role.role}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRoleManager; 