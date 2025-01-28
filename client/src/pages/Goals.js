import React, { useState, useEffect } from 'react';
import GoalInput from '../components/GoalInput';
import GoalList from '../components/GoalList';

const Goals = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleGoalAdded = () => {
    // Trigger a refresh of the GoalList component
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Goals Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <GoalInput onGoalAdded={handleGoalAdded} />
        </div>
        
        <div>
          <GoalList key={refreshKey} />
        </div>
      </div>
    </div>
  );
};

export default Goals; 