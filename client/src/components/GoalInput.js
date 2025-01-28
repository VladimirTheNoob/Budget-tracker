import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const GoalInput = ({ onGoalAdded }) => {
  const [departments, setDepartments] = useState([]);
  const [departmentGoals, setDepartmentGoals] = useState({});
  const [currentValues, setCurrentValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [deptResponse, valuesResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/employee-departments', {
          withCredentials: true
        }),
        axios.get('http://localhost:5000/api/department-values', {
          withCredentials: true
        })
      ]);

      // Get unique departments
      const uniqueDepartments = [...new Set(deptResponse.data.map(ed => ed.department))];
      setDepartments(uniqueDepartments);
      
      // Initialize department goals and current values
      const initialGoals = {};
      uniqueDepartments.forEach(dept => {
        initialGoals[dept] = '';
      });
      setDepartmentGoals(initialGoals);
      
      // Set current values
      setCurrentValues(valuesResponse.data || {});
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please try again later.');
      setLoading(false);
    }
  };

  const handleGoalChange = (department, value) => {
    setDepartmentGoals(prev => ({
      ...prev,
      [department]: value
    }));
  };

  const handleCurrentValueChange = async (department, value) => {
    try {
      const newValues = {
        ...currentValues,
        [department]: value
      };
      setCurrentValues(newValues);

      await axios.put('http://localhost:5000/api/department-values', newValues, {
        withCredentials: true
      });
    } catch (error) {
      console.error('Error updating current value:', error);
    }
  };

  const calculateExecution = (currentValue, goalValue) => {
    if (!goalValue || isNaN(goalValue) || !currentValue || isNaN(currentValue)) return 0;
    return ((currentValue / goalValue) - 1) * 100;
  };

  if (loading) {
    return <div className="text-center p-4">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Department Goals</h1>
      
      {/* Department Goals Table */}
      <div className="bg-white shadow-md rounded my-6">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Department</th>
              <th className="py-3 px-6 text-left">Current State</th>
              <th className="py-3 px-6 text-left">Goal</th>
              <th className="py-3 px-6 text-center">% Execution</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {departments.map((department) => (
              <tr key={department} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left whitespace-nowrap">
                  <div className="font-medium">{department}</div>
                </td>
                <td className="py-3 px-6 text-left">
                  <input
                    type="number"
                    value={currentValues[department] || ''}
                    onChange={(e) => handleCurrentValueChange(department, e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Enter current value"
                  />
                </td>
                <td className="py-3 px-6 text-left">
                  <input
                    type="number"
                    value={departmentGoals[department]}
                    onChange={(e) => handleGoalChange(department, e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Enter goal value"
                  />
                </td>
                <td className="py-3 px-6 text-center">
                  {calculateExecution(currentValues[department], departmentGoals[department]).toFixed(2)}%
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-4">
                  No departments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <Link to="/tasks" className="text-blue-500 hover:underline">
          Go to Task List
        </Link>
        <Link to="/tasks/input" className="ml-4 text-blue-500 hover:underline">
          Go to Task Input
        </Link>
      </div>
    </div>
  );
};

export default GoalInput; 