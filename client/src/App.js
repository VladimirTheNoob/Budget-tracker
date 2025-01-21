import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';

// Import your components
import TaskInput from './components/TaskInput';
import BudgetTracker from './components/BudgetTracker';
import GoalList from './components/GoalList';

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<div>Welcome to Budget Tracker</div>} />
        <Route path="/create-task" element={<TaskInput />} />
        <Route path="/budget-tracker" element={<BudgetTracker />} />
        <Route path="/goals" element={<GoalList />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; 