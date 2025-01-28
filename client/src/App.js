import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import LoginButton from './components/LoginButton';
import ProtectedRoute from './components/ProtectedRoute';
import { useDispatch } from 'react-redux';
import { loginSuccess, logout } from './store/authSlice';
import Header from './components/Header';
import { ROLES } from './config/roles';

// Import your components
import TaskInput from './components/TaskInput';
import GoalList from './components/GoalList';
import TaskList from './components/TaskList';
import AdminRoleManager from './components/AdminRoleManager';
import GoalSetting from './components/GoalSetting';
import GoalInput from './components/GoalInput';

function App() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('list');
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
      
      const role = response.data.role || 
        (response.data.user?.emails?.[0]?.value === 'belyakovvladimirs@gmail.com' ? ROLES.ADMIN : 
         response.data.user?.emails?.[0]?.value === 'vladimirbelyakov1981@gmail.com' ? ROLES.MANAGER :
         ROLES.EMPLOYEE);
      
      console.log('Resolved Role:', role);
      
      dispatch(loginSuccess({
        user: response.data.user,
        role: role
      }));

      setIsAuthenticated(response.data.authenticated);
      setUser(response.data.user);
      setUserRole(role);

    } catch (error) {
      console.error('Error checking auth status:', error);
      
      dispatch(logout());

      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
    }
  }, [dispatch]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

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
        
        if (employeesRes.status === 200) {
          setEmployees(employeesRes.data);
        } else {
          console.warn('No permission to fetch employees');
          alert('You do not have permission to view employee details.');
          setEmployees([]);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        alert('An error occurred while fetching data. Please try again later.');
        setTasks([]);
        setEmployees([]);
      }
    };
    
    if (isAuthenticated) {
      fetchInitialData();
    }
  }, [isAuthenticated]);

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

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
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
              </>
            )}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App; 