import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchGoals, saveGoals, updateGoal } from '../store/goalsSlice';
import { ROLES } from '../config/roles';

const GoalSetting = () => {
  const [departments] = useState([
    'Department1', 'Department2', 'Department3', 'Department4', 
    'Department5', 'Department6', 'Department7', 'Department8', 
    'Department9', 'Department10'
  ]);

  const dispatch = useDispatch();
  const goals = useSelector(state => state.goals.data);
  const status = useSelector(state => state.goals.status);
  const error = useSelector(state => state.goals.error);
  const userRole = useSelector(state => state.auth.role);

  useEffect(() => {
    dispatch(fetchGoals());
  }, [dispatch]);

  const handleGoalChange = (department, kpi, field, value) => {
    dispatch(updateGoal({ department, kpi, field, value }));
  };

  const handleSave = () => {
    dispatch(saveGoals(goals));
  };

  // Check if user has permission to edit
  const canEdit = userRole === ROLES.ADMIN || userRole === ROLES.MANAGER;

  if (status === 'loading') {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (status === 'failed') {
    return <div className="container mx-auto p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Department Goals</h1>
        {canEdit && (
          <button
            onClick={handleSave}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
            disabled={status === 'saving'}
          >
            {status === 'saving' ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-3 text-left">Department</th>
              <th className="border p-3 text-center" colSpan="3">KPI_1</th>
              <th className="border p-3 text-center" colSpan="3">KPI_2</th>
              <th className="border p-3 text-center" colSpan="3">KPI_3</th>
            </tr>
            <tr className="bg-gray-50">
              <th className="border p-3"></th>
              {/* KPI_1 columns */}
              <th className="border p-3">Goal</th>
              <th className="border p-3">Current state</th>
              <th className="border p-3">% execution</th>
              {/* KPI_2 columns */}
              <th className="border p-3">Goal</th>
              <th className="border p-3">Current state</th>
              <th className="border p-3">% execution</th>
              {/* KPI_3 columns */}
              <th className="border p-3">Goal</th>
              <th className="border p-3">Current state</th>
              <th className="border p-3">% execution</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((department) => (
              <tr key={department}>
                <td className="border p-3 font-medium">{department}</td>
                {/* KPI_1 inputs */}
                <td className="border p-2">
                  <input
                    type="text"
                    className="w-full p-1 border rounded"
                    value={goals[department]?.KPI_1?.goal || ''}
                    onChange={(e) => handleGoalChange(department, 'KPI_1', 'goal', e.target.value)}
                    disabled={!canEdit}
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="text"
                    className="w-full p-1 border rounded"
                    value={goals[department]?.KPI_1?.currentState || ''}
                    onChange={(e) => handleGoalChange(department, 'KPI_1', 'currentState', e.target.value)}
                    disabled={!canEdit}
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="text"
                    className="w-full p-1 border rounded"
                    value={goals[department]?.KPI_1?.execution || ''}
                    onChange={(e) => handleGoalChange(department, 'KPI_1', 'execution', e.target.value)}
                    disabled={!canEdit}
                  />
                </td>
                {/* KPI_2 inputs */}
                <td className="border p-2">
                  <input
                    type="text"
                    className="w-full p-1 border rounded"
                    value={goals[department]?.KPI_2?.goal || ''}
                    onChange={(e) => handleGoalChange(department, 'KPI_2', 'goal', e.target.value)}
                    disabled={!canEdit}
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="text"
                    className="w-full p-1 border rounded"
                    value={goals[department]?.KPI_2?.currentState || ''}
                    onChange={(e) => handleGoalChange(department, 'KPI_2', 'currentState', e.target.value)}
                    disabled={!canEdit}
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="text"
                    className="w-full p-1 border rounded"
                    value={goals[department]?.KPI_2?.execution || ''}
                    onChange={(e) => handleGoalChange(department, 'KPI_2', 'execution', e.target.value)}
                    disabled={!canEdit}
                  />
                </td>
                {/* KPI_3 inputs */}
                <td className="border p-2">
                  <input
                    type="text"
                    className="w-full p-1 border rounded"
                    value={goals[department]?.KPI_3?.goal || ''}
                    onChange={(e) => handleGoalChange(department, 'KPI_3', 'goal', e.target.value)}
                    disabled={!canEdit}
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="text"
                    className="w-full p-1 border rounded"
                    value={goals[department]?.KPI_3?.currentState || ''}
                    onChange={(e) => handleGoalChange(department, 'KPI_3', 'currentState', e.target.value)}
                    disabled={!canEdit}
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="text"
                    className="w-full p-1 border rounded"
                    value={goals[department]?.KPI_3?.execution || ''}
                    onChange={(e) => handleGoalChange(department, 'KPI_3', 'execution', e.target.value)}
                    disabled={!canEdit}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GoalSetting; 
