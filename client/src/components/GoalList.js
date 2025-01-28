import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GoalList = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/goals', {
          withCredentials: true
        });
        setGoals(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching goals:', err);
        setError('Failed to fetch goals. Please try again later.');
        setLoading(false);
      }
    };

    fetchGoals();
  }, []);

  if (loading) {
    return <div className="text-center p-4">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Department Goals</h1>
      {goals.map((goal, index) => (
        <div 
          key={goal.id || `goal-${index}`} 
          className="bg-white shadow-md rounded-lg p-4 mb-4"
        >
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{goal.department}</h2>
            <span className="text-sm text-gray-600">{goal.status}</span>
          </div>
          <strong>{goal.title}</strong>: {goal.description}
        </div>
      ))}
    </div>
  );
};

export default GoalList; 