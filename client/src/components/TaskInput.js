import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TaskInput = () => {
  // State to manage form inputs
  const [task, setTask] = useState({
    taskName: '',
    employee: '',
    date: '',
    comments: ''
  });

  // State for bulk tasks
  const [bulkTasks, setBulkTasks] = useState('');
  const [parsedTasks, setParsedTasks] = useState([]);

  // State for employee-department input
  const [bulkEmployeeDepartment, setBulkEmployeeDepartment] = useState('');
  const [parsedEmployeeDepartment, setParsedEmployeeDepartment] = useState([]);

  // State for fetched tasks and employees
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Fetch tasks and employees data when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('=== FETCHING TASKS AND EMPLOYEES DATA ===');
        
        // Fetch tasks
        console.log('Attempting to fetch tasks from: http://localhost:5000/api/tasks');
        const tasksResponse = await axios.get('http://localhost:5000/api/tasks', {
          timeout: 10000  // 10-second timeout
        });
        console.log('Tasks Response:', {
          status: tasksResponse.status,
          data: tasksResponse.data,
          headers: tasksResponse.headers
        });

        // Validate and set tasks
        if (Array.isArray(tasksResponse.data)) {
          console.log(`Setting ${tasksResponse.data.length} tasks`);
          setTasks(tasksResponse.data);
        } else {
          console.error('Tasks response is not an array:', tasksResponse.data);
          setTasks([]);
        }

        // Fetch employees
        console.log('Fetching employees...');
        const employeesResponse = await axios.get('http://localhost:5000/api/employees', {
          timeout: 10000
        });
        console.log('Employees fetched:', employeesResponse.data);
        if (Array.isArray(employeesResponse.data)) {
          setEmployees(employeesResponse.data);
        } else {
          console.error('Employees response is not an array:', employeesResponse.data);
          setEmployees([]);
        }

      } catch (error) {
        console.error('=== COMPREHENSIVE DATA FETCH ERROR ===', error);
        
        // Detailed error logging
        if (error.response) {
          console.error('Server Response Error:', {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers
          });
        } else if (error.request) {
          console.error('No Response Received:', error.request);
        } else {
          console.error('Request Setup Error:', error.message);
        }

        // Set empty arrays to prevent undefined errors
        setTasks([]);
        setEmployees([]);

        // User-friendly error message
        alert(`Failed to fetch tasks or employees: 
          ${error.message}
          
          Please check your server connection and try again.
        `);
      }
    };

    fetchData();
  }, []);

  // Handle bulk tasks input
  const handleBulkTasksChange = (e) => {
    const value = e.target.value;
    setBulkTasks(value);
    // Parse tasks (split by new line)
    const tasks = value.split('\n').filter(task => task.trim() !== '');
    setParsedTasks(tasks);
  };

  // Handle employee-department input
  const handleBulkEmployeeDepartmentChange = (e) => {
    const value = e.target.value;
    setBulkEmployeeDepartment(value);
    // Parse employee-department pairs (split by new line and delimiter)
    const pairs = value.split('\n').filter(pair => pair.trim() !== '');
    const employeeDepartment = pairs.map(pair => {
      const [employee, department] = pair.split(';').map(item => item.trim());
      return { employee, department };
    });
    setParsedEmployeeDepartment(employeeDepartment);
  };

  // Handle task selection from parsed tasks
  const handleTaskSelection = (e) => {
    const selectedValue = e.target.value;
    setTask(prev => ({
      ...prev,
      taskName: selectedValue
    }));
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'employee') {
      // Find the selected employee to get their department
      const selectedEmployee = employees.find(emp => emp.name === value);
      setTask(prevTask => ({
        ...prevTask,
        employee: value,
        department: selectedEmployee ? selectedEmployee.department : ''
      }));
    } else {
      setTask(prevTask => ({
        ...prevTask,
        [name]: value
      }));
    }
  };

  // Handle bulk data submission
  const handleBulkDataSubmission = async () => {
    try {
      // Save tasks to database
      if (parsedTasks.length > 0) {
        console.log('Preparing bulk tasks data:', parsedTasks);
        const tasksData = parsedTasks.map(taskName => ({ 
          name: taskName.trim(),
          status: 'pending',
          createdAt: new Date().toISOString()
        }));
        
        console.log('Sending bulk tasks:', { 
          tasks: tasksData,
          requestDetails: {
            url: 'http://localhost:5000/api/bulk-tasks',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        });

        try {
          const tasksResponse = await axios.post('http://localhost:5000/api/bulk-tasks', { 
            tasks: tasksData 
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          console.log('Bulk tasks saved successfully:', tasksResponse.data);
        } catch (apiError) {
          console.error('Detailed API Error for Bulk Tasks:', {
            message: apiError.message,
            response: apiError.response?.data,
            status: apiError.response?.status,
            config: apiError.config,
            requestData: { tasks: tasksData }
          });
          throw apiError;
        }
      }

      // Save employee-department pairs to database
      if (parsedEmployeeDepartment.length > 0) {
        console.log('Preparing employee-department data:', parsedEmployeeDepartment);
        const formattedPairs = parsedEmployeeDepartment.map(pair => ({
          employee: pair.employee.trim(),
          department: pair.department.trim(),
          createdAt: new Date().toISOString()
        }));

        console.log('Sending employee-department pairs:', { 
          employeeDepartments: formattedPairs,
          requestDetails: {
            url: 'http://localhost:5000/api/employee-departments',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        });

        try {
          const pairsResponse = await axios.post('http://localhost:5000/api/employee-departments', { 
            employeeDepartments: formattedPairs 
          });
          console.log('Employee-department pairs saved successfully:', pairsResponse.data);
          
          // Refresh employees list after successful submission
          console.log('Refreshing employees list...');
          const employeesResponse = await axios.get('http://localhost:5000/api/employees');
          if (Array.isArray(employeesResponse.data)) {
            console.log('Updated employees list:', employeesResponse.data);
            setEmployees(employeesResponse.data);
          }
        } catch (apiError) {
          console.error('Detailed API Error for Employee-Departments:', {
            message: apiError.message,
            response: apiError.response?.data,
            status: apiError.response?.status,
            config: apiError.config,
            requestData: { employeeDepartments: formattedPairs }
          });
          throw apiError;
        }
      }

      // Clear bulk input fields after successful submission
      setBulkTasks('');
      setBulkEmployeeDepartment('');
      setParsedTasks([]);
      setParsedEmployeeDepartment([]);

      // Show success message
      alert('Bulk data saved successfully!');

    } catch (error) {
      console.error('Comprehensive Error saving bulk data:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config,
        stack: error.stack
      });
      
      alert(`Error saving bulk data: 
        ${error.response?.data?.error || error.message}
        
        Status: ${error.response?.status || 'Unknown'}
        Details: ${JSON.stringify(error.response?.data) || 'No additional details'}
      `);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // First save bulk data if any exists
      await handleBulkDataSubmission();

      // Then save the individual task
      console.log('Sending individual task:', task);
      const response = await axios.post('http://localhost:5000/api/tasks', task, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      console.log('Task created:', response.data);
      
      // Reset form after successful submission
      setTask({
        taskName: '',
        employee: '',
        department: '',
        date: '',
        comments: ''
      });
    } catch (error) {
      console.error('Error creating task:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert(`Error creating task: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Create Task</h2>
      
      {/* Bulk Tasks Input */}
      <div className="mb-6">
        <label 
          htmlFor="bulkTasks" 
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Bulk Tasks Input (one task per line)
        </label>
        <textarea
          id="bulkTasks"
          value={bulkTasks}
          onChange={handleBulkTasksChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          rows="5"
          placeholder="Enter multiple tasks, one per line"
        />
        <p className="text-sm text-gray-600 mt-1">
          {parsedTasks.length} tasks ready to be saved
        </p>
      </div>

      {/* Employee-Department Input */}
      <div className="mb-6">
        <label 
          htmlFor="bulkEmployeeDepartment" 
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Employee-Department Input (format: employee;department)
        </label>
        <textarea
          id="bulkEmployeeDepartment"
          value={bulkEmployeeDepartment}
          onChange={handleBulkEmployeeDepartmentChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          rows="5"
          placeholder="Enter employee and department pairs, one per line (e.g., John Doe;Sales)"
        />
        <p className="text-sm text-gray-600 mt-1">
          {parsedEmployeeDepartment.length} employee-department pairs ready to be saved
        </p>
      </div>

      {/* Save Bulk Data Button */}
      <div className="mb-6 flex justify-center">
        <button
          type="button"
          onClick={handleBulkDataSubmission}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-4"
          disabled={parsedTasks.length === 0 && parsedEmployeeDepartment.length === 0}
        >
          Save Bulk Data
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Task Selection Dropdown */}
        <div className="mb-4">
          <label 
            htmlFor="taskName" 
            className="block text-gray-700 text-sm font-bold mb-2"
          >
            Select Task
          </label>
          {(() => {
            console.log('Rendering Tasks Dropdown:', {
              tasksCount: tasks.length,
              tasksData: tasks
            });
            return (
              <select
                id="taskName"
                name="taskName"
                value={task.taskName}
                onChange={handleTaskSelection}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="">Select a task</option>
                {tasks.map((taskItem) => (
                  <option 
                    key={`task-${taskItem.id}`} 
                    value={taskItem.name}
                  >
                    {taskItem.name} - {taskItem.description}
                  </option>
                ))}
              </select>
            );
          })()}
        </div>

        {/* Employee Dropdown */}
        <div className="mb-4">
          <label 
            htmlFor="employee" 
            className="block text-gray-700 text-sm font-bold mb-2"
          >
            Employee
          </label>
          {(() => {
            console.log('=== EMPLOYEE DROPDOWN DEBUG ===');
            console.log('Current employees state:', employees);
            console.log('Current task.employee value:', task.employee);
            console.log('Number of employees:', employees.length);
            
            if (employees.length === 0) {
              console.log('Warning: No employees available in the dropdown');
            }

            return (
              <select
                id="employee"
                name="employee"
                value={task.employee}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="">Select an employee</option>
                {employees.map((employee, index) => {
                  console.log(`Rendering employee option ${index}:`, employee);
                  return (
                    <option 
                      key={`employee-${employee.id || index}`} 
                      value={employee.name}
                    >
                      {employee.name}
                    </option>
                  );
                })}
              </select>
            );
          })()}
        </div>

        {/* Department Display */}
        <div className="mb-4">
          <label 
            htmlFor="department" 
            className="block text-gray-700 text-sm font-bold mb-2"
          >
            Department
          </label>
          <input
            type="text"
            id="department"
            name="department"
            value={
              employees.find(emp => emp.name === task.employee)?.department || ''
            }
            readOnly
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        {/* Date Input */}
        <div className="mb-4">
          <label 
            htmlFor="date" 
            className="block text-gray-700 text-sm font-bold mb-2"
          >
            Date
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={task.date}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>

        {/* Comments Input */}
        <div className="mb-4">
          <label 
            htmlFor="comments" 
            className="block text-gray-700 text-sm font-bold mb-2"
          >
            Comments
          </label>
          <textarea
            id="comments"
            name="comments"
            value={task.comments}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter any additional comments"
            rows="4"
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-center">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Create Task
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskInput; 