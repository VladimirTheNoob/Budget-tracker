import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import LoginButton from './components/LoginButton';
import LogoutButton from './components/LogoutButton';

// Import your components
import TaskInput from './components/TaskInput';
import BudgetTracker from './components/BudgetTracker';
import GoalList from './components/GoalList';
import TaskList from './components/TaskList';
import AdminRoleManager from './components/AdminRoleManager';

const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager', 
  EMPLOYEE: 'employee'
};

function App() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'input'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/auth/status', { 
        withCredentials: true 
      });
      
      console.log('Full Auth Status Response:', response.data);
      
      // Ensure role is set correctly
      const role = response.data.role || 
        (response.data.user?.emails?.[0]?.value === 'belyakovvladimirs@gmail.com' ? ROLES.ADMIN : 
         response.data.user?.emails?.[0]?.value === 'vladimirbelyakov1981@gmail.com' ? ROLES.MANAGER :
         ROLES.EMPLOYEE);
      
      console.log('Resolved Role:', role);
      
      setIsAuthenticated(response.data.authenticated);
      setUser(response.data.user);
      setUserRole(role);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const handleLogout = async () => {
    return new Promise((resolve) => {
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
      resolve();
    });
  };

  // Add useEffect to load initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [tasksRes, employeesRes] = await Promise.all([
          axios.get('http://localhost:5000/api/tasks', { withCredentials: true }),
          axios.get('http://localhost:5000/api/employees', { 
            withCredentials: true,
            validateStatus: (status) => status === 200 || status === 403 
          })
        ]);
        
        setTasks(tasksRes.data);
        
        // Only set employees if the request was successful
        if (employeesRes.status === 200) {
          setEmployees(employeesRes.data);
        } else {
          console.warn('No permission to fetch employees');
          // Optionally, show a user-friendly notification
          alert('You do not have permission to view employee details.');
          setEmployees([]);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        // Optionally, show a user-friendly notification
        alert('An error occurred while fetching data. Please try again later.');
        setTasks([]);
        setEmployees([]);
      }
    };
    
    if (isAuthenticated) {
      fetchInitialData();
    }
  }, [isAuthenticated]);

  // Render navigation tabs based on user role
  const renderNavTabs = () => {
    console.log('Rendering Nav Tabs - User Role:', userRole);
    const tabs = [
      { name: 'Task List', value: 'list' },
      { name: 'Task Input', value: 'input' }
    ];

    // Add admin tab for admin and manager roles
    if ([ROLES.ADMIN, ROLES.MANAGER].includes(userRole)) {
      console.log('Adding Admin Tab');
      tabs.push({ name: 'Admin', value: 'admin' });
    }

    return tabs.map(tab => (
      <button
        key={tab.value}
        onClick={() => setActiveTab(tab.value)}
        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
          activeTab === tab.value
            ? 'border-indigo-500 text-gray-900'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        {tab.name}
      </button>
    ));
  };

  // Main content rendering
  const renderMainContent = () => {
    console.log('Rendering Main Content:', {
      isAuthenticated,
      activeTab,
      userRole
    });

    if (!isAuthenticated) {
      return <LoginButton />;
    }

    switch (activeTab) {
      case 'list':
        return <TaskList 
          refreshTrigger={refreshTrigger}
          tasks={tasks}
          employees={employees}
        />;
      case 'input':
        return <TaskInput 
          onDataSaved={() => setRefreshTrigger(prev => prev + 1)}
          tasks={tasks}
          employees={employees}
          setTasks={setTasks}
          setEmployees={setEmployees}
        />;
      case 'admin':
        if ([ROLES.ADMIN, ROLES.MANAGER].includes(userRole)) {
          console.log('Rendering Admin Role Manager');
          return <AdminRoleManager currentUserRole={userRole} />;
        } else {
          console.log('Access Denied for Admin Tab');
          return (
            <div className="text-center text-red-600">
              Access Denied: Insufficient Permissions
            </div>
          );
        }
      default:
        return null;
    }
  };

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
                  {renderNavTabs()}
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
                      <span className="ml-2 text-xs text-gray-500 uppercase">
                        ({userRole})
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
          {renderMainContent()}
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App; 