import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Import your components
import TaskInput from './components/TaskInput';
import BudgetTracker from './components/BudgetTracker';
import GoalList from './components/GoalList';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/create-task" element={<TaskInput />} />
          <Route path="/budget-tracker" element={<BudgetTracker />} />
          <Route path="/goals" element={<GoalList />} />
          <Route path="/" element={<div>Welcome to Budget Tracker</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 