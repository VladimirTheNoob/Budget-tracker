import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import LoginButton from './components/LoginButton';
import LogoutButton from './components/LogoutButton';

// Import your components
import TaskInput from './components/TaskInput';
import BudgetTracker from './components/BudgetTracker';
import GoalList from './components/GoalList';
import TaskList from './components/TaskList';

function App() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'input'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/auth/status', { 
        withCredentials: true 
      });
      setIsAuthenticated(response.data.authenticated);
      setUser(response.data.user);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const handleLogout = async () => {
    return new Promise((resolve) => {
      setIsAuthenticated(false);
      setUser(null);
      resolve();
    });
  };

  // Add useEffect to load initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      const [tasksRes, employeesRes] = await Promise.all([
        axios.get('http://localhost:5000/api/tasks'),
        axios.get('http://localhost:5000/api/employees')
      ]);
      
      setTasks(tasksRes.data);
      setEmployees(employeesRes.data);
    };
    
    fetchInitialData();
  }, []); // Empty dependency array = runs once on mount

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="min-h-screen bg-gray-100">
        {/* Navigation */}
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('list')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      activeTab === 'list'
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Task List
                  </button>
                  <button
                    onClick={() => setActiveTab('input')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      activeTab === 'input'
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Task Input
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {isAuthenticated && user ? (
                  <>
                    <div className="flex items-center">
                      <img
                        src={user.photos?.[0]?.value || 'https://via.placeholder.com/32x32'}
                        alt="Profile"
                        className="w-8 h-8 rounded-full mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        {user.displayName || `${user.name?.givenName} ${user.name?.familyName}`}
                      </span>
                    </div>
                    <LogoutButton onLogout={handleLogout} />
                  </>
                ) : (
                  <LoginButton />
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {activeTab === 'list' ? (
            <TaskList 
              refreshTrigger={refreshTrigger}
              tasks={tasks}
              employees={employees}
            />
          ) : (
            <TaskInput 
              onDataSaved={() => setRefreshTrigger(prev => prev + 1)}
              tasks={tasks}
              employees={employees}
              setTasks={setTasks}
              setEmployees={setEmployees}
            />
          )}
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App; 