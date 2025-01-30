import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import LoginButton from './components/LoginButton';
import ProtectedRoute from './components/ProtectedRoute';
import { useDispatch, useSelector } from 'react-redux';
import { loginSuccess, logout } from './store/authSlice';
import Header from './components/Header';
import { ROLES } from './config/roles';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';

// Configure axios base URL and defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
axios.defaults.withCredentials = true;

// Import your components
import TaskInput from './components/TaskInput';
import GoalList from './components/GoalList';
import TaskList from './components/TaskList';
import AdminRoleManager from './components/AdminRoleManager';
import GoalSetting from './components/GoalSetting';
import GoalInput from './components/GoalInput';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, userRole } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('list');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await axios.get('/auth/status');
      console.log('Full Auth Status Response:', response.data);
      
      // Explicitly log detailed authentication status
      const detailedStatus = {
        authenticated: response.data.authenticated,
        user: response.data.user,
        role: response.data.role
      };
      console.log('Detailed Auth Status:', detailedStatus);

      // Dispatch login success with explicit role handling
      if (response.data.authenticated) {
        const userEmail = response.data.user?.email || 
          response.data.user?.emails?.[0]?.value || 
          'Unknown Email';

        const userRole = response.data.role || 
          (userEmail.toLowerCase() === 'belyakovvladimirs@gmail.com' 
            ? 'admin' 
            : 'employee');

        dispatch(loginSuccess({
          user: {
            ...response.data.user,
            email: userEmail
          },
          authenticated: true,
          userRole: userRole
        }));

        console.log('Dispatched Login Success with Role:', userRole);
        setIsLoading(false);
      } else {
        dispatch(logout());
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      
      // More detailed error handling
      if (error.response) {
        // The request was made and the server responded with a status code
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
      }
      
      dispatch(logout());
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [tasksRes, employeesRes] = await Promise.all([
          axios.get('http://localhost:5000/api/tasks', { 
            withCredentials: true,
            validateStatus: (status) => status === 200 || status === 401 
          }),
          axios.get('http://localhost:5000/api/employees', { 
            withCredentials: true,
            validateStatus: (status) => status === 200 || status === 401 
          })
        ]);
        
        // Handle tasks response
        if (tasksRes.status === 200) {
          setTasks(tasksRes.data);
        } else {
          console.warn('Unauthorized to fetch tasks');
          setTasks([]);
        }
        
        // Handle employees response
        if (employeesRes.status === 200) {
          setEmployees(employeesRes.data);
        } else {
          console.warn('Unauthorized to fetch employees');
          setEmployees([]);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        
        // Check if the error is due to authentication
        if (error.response && error.response.status === 401) {
          dispatch(logout());
          setIsLoading(false);
        } else {
          alert('An error occurred while fetching data. Please try again later.');
        }
        
        setTasks([]);
        setEmployees([]);
      }
    };
    
    // Ensure both isAuthenticated and userRole are truthy
    if (isAuthenticated && userRole) {
      fetchInitialData();
    }
  }, [isAuthenticated, userRole, dispatch]);

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
          return <AdminRoleManager currentUserRole={userRole} />;
        } else {
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <div className="min-h-screen bg-gray-100">
          <Toaster 
            position="top-right" 
            toastOptions={{
              success: { duration: 3000 },
              error: { duration: 5000 }
            }} 
          />
          <Header />
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <ErrorBoundary>
              <Routes>
                <Route 
                  path="/" 
                  element={renderMainContent()}
                />
                {!isAuthenticated ? (
                  <Route path="*" element={
                    <div className="flex flex-col items-center justify-center min-h-[60vh]">
                      <h1 className="text-2xl font-bold mb-8 text-gray-800">Welcome to Budget Tracker</h1>
                      <LoginButton className="transform scale-125 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition duration-200" />
                    </div>
                  } />
                ) : (
                  <>
                    <Route path="/tasks" element={
                      <ProtectedRoute 
                        allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE]}
                        isAuthenticated={isAuthenticated}
                        userRole={userRole}
                      >
                        <TaskList 
                          refreshTrigger={refreshTrigger}
                          tasks={tasks}
                          employees={employees}
                        />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/tasks/input" element={
                      <ProtectedRoute
                        allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE]}
                        isAuthenticated={isAuthenticated}
                        userRole={userRole}
                      >
                        <TaskInput 
                          onDataSaved={() => setRefreshTrigger(prev => prev + 1)}
                          tasks={tasks}
                          employees={employees}
                          setTasks={setTasks}
                          setEmployees={setEmployees}
                        />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/goals" element={
                      <ProtectedRoute 
                        allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}
                        isAuthenticated={isAuthenticated}
                        userRole={userRole}
                      >
                        <GoalList />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/goals/setting" element={
                      <ProtectedRoute
                        allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}
                        isAuthenticated={isAuthenticated}
                        userRole={userRole}
                      >
                        <GoalSetting />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/goals/input" element={
                      <ProtectedRoute
                        allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}
                        isAuthenticated={isAuthenticated}
                        userRole={userRole}
                      >
                        <GoalInput />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/admin/roles" element={
                      <ProtectedRoute
                        allowedRoles={[ROLES.ADMIN]}
                        isAuthenticated={isAuthenticated}
                        userRole={userRole}
                      >
                        <AdminRoleManager currentUserRole={userRole} />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-of-service" element={<TermsOfService />} />
                  </>
                )}
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App; 