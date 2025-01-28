import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const GoalInput = ({ onGoalAdded }) => {
  const [goals, setGoals] = useState([]);
  const [goal, setGoal] = useState({
    title: '',
    description: '',
    targetDate: '',
    targetAmount: '',
    status: 'pending'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch goals on component mount
  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/goals', {
        withCredentials: true
      });
      if (Array.isArray(response.data)) {
        setGoals(response.data);
      } else {
        setGoals([]); // Set an empty array if the response data is not an array
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching goals:', err);
      setError('Failed to fetch goals. Please try again later.');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setGoal(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/goals', goal, {
        withCredentials: true
      });
      
      if (response.status === 201) {
        // Clear form
        setGoal({
          title: '',
          description: '',
          targetDate: '',
          targetAmount: '',
          status: 'pending'
        });
        
        // Notify parent component
        if (onGoalAdded) {
          onGoalAdded(response.data);
        }
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      alert('Failed to create goal. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Goal Input</h1>
      
      {/* Goal Input Form */}
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Create New Goal</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              name="title"
              value={goal.title}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              value={goal.description}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Target Date</label>
            <input
              type="date"
              name="targetDate"
              value={goal.targetDate}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Target Amount</label>
            <input
              type="number"
              name="targetAmount"
              value={goal.targetAmount}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Goal
          </button>
        </form>
      </div>

      {/* Goals Table */}
      <div className="bg-white shadow-md rounded my-6">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Title</th>
              <th className="py-3 px-6 text-left">Description</th>
              <th className="py-3 px-6 text-center">Target Date</th>
              <th className="py-3 px-6 text-center">Target Amount</th>
              <th className="py-3 px-6 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {goals.map((goal, index) => (
              <tr key={`goal-${index}`} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left whitespace-nowrap">
                  <div className="font-medium">{goal.title}</div>
                </td>
                <td className="py-3 px-6 text-left">
                  <div className="font-medium">{goal.description}</div>
                </td>
                <td className="py-3 px-6 text-center">
                  {new Date(goal.targetDate).toLocaleDateString()}
                </td>
                <td className="py-3 px-6 text-center">
                  ${goal.targetAmount}
                </td>
                <td className="py-3 px-6 text-center">
                  <span className={`bg-${goal.status === 'completed' ? 'green' : 'yellow'}-200 text-${goal.status === 'completed' ? 'green' : 'yellow'}-600 py-1 px-3 rounded-full text-xs`}>
                    {goal.status}
                  </span>
                </td>
              </tr>
            ))}
            {goals.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-4">
                  No goals found. Add your first goal using the form above.
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