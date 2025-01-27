import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

const TaskInput = (props) => {
  // State to manage form inputs
  const [task, setTask] = useState({
    taskName: '',
    employee: '',
    mail: '', 
    date: '',
    comments: ''
  });

  // State for bulk tasks
  const [bulkTasks, setBulkTasks] = useState('');
  const [parsedTasks, setParsedTasks] = useState([]);

  // State for employee-department input
  const [bulkEmployeeDepartment, setBulkEmployeeDepartment] = useState('');
  const [parsedEmployeeDepartment, setParsedEmployeeDepartment] = useState([]);

  // Destructure props with default values
  const { 
    tasks = [], 
    employees = [], 
    setTasks, 
    setEmployees, 
    onDataSaved = () => {} 
  } = props;

  // Memoized unique employees to prevent unnecessary re-renders
  const uniqueEmployees = useMemo(() => 
    [...new Map(employees.map(emp => [emp.id, emp])).values()], 
    [employees]
  );

  // Memoized data fetching function
  const fetchData = useCallback(async () => {
    try {
      const [tasksResponse, employeesResponse, employeeDepartmentsResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/tasks', { withCredentials: true }),
        axios.get('http://localhost:5000/api/employees', { withCredentials: true }),
        axios.get('http://localhost:5000/api/employee-departments', { withCredentials: true })
      ]);

      // Process tasks
      if (Array.isArray(tasksResponse.data)) {
        const tasksWithIds = tasksResponse.data.map((task, index) => ({
          ...task,
          id: task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          taskName: task.name
        }));
        setTasks(tasksWithIds);
      }

      // Process employees
      if (Array.isArray(employeesResponse.data)) {
        setEmployees(employeesResponse.data);
      }

      // Process employee departments
      if (Array.isArray(employeeDepartmentsResponse.data)) {
        setParsedEmployeeDepartment(employeeDepartmentsResponse.data);
      } else {
        setParsedEmployeeDepartment([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to fetch data. Please try again.');
    }
  }, [setTasks, setEmployees]);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleBulkTasksChange = useCallback((e) => {
    const value = e.target.value;
    setBulkTasks(value);
    const tasks = value.split('\n').filter(task => task.trim() !== '');
    setParsedTasks(tasks);
  }, []);

  const handleBulkEmployeeDepartmentChange = useCallback((e) => {
    const value = e.target.value;
    setBulkEmployeeDepartment(value);
    const pairs = value.split('\n')
      .filter(pair => pair.trim() !== '')
      .map(pair => {
        const [employee, department, email] = pair.split(';').map(item => item.trim());
        return { employee, department, email };
      })
      .filter(pair => pair.employee && pair.department && pair.email);
    setParsedEmployeeDepartment(pairs);
  }, []);

  const handleTaskSelection = useCallback((e) => {
    const { value } = e.target;
    setTask(prev => ({
      ...prev,
      taskName: value
    }));
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    
    if (name === 'taskName') {
      setTask(prev => ({ ...prev, taskName: value }));
    } else if (name === 'employee') {
      const selectedEmployee = employees.find(emp => emp.name === value);
      setTask(prev => ({
        ...prev,
        employee: value,
        department: selectedEmployee?.department || '',
        mail: selectedEmployee?.email || ''
      }));
    } else {
      setTask(prev => ({ ...prev, [name]: value }));
    }
  }, [employees]);

  const handleBulkDataSubmission = useCallback(async () => {
    try {
      // Check for duplicates in bulk tasks
      if (bulkTasks.length > 0) {
        const tasks = bulkTasks.split('\n').map(task => task.trim()).filter(task => task !== '');
        
        // Check for duplicates within the input
        const uniqueTasks = new Set(tasks);
        if (uniqueTasks.size !== tasks.length) {
          const duplicates = tasks.filter((task, index) => 
            tasks.indexOf(task) !== index
          );
          alert(`Duplicate tasks found in input: ${[...new Set(duplicates)].join(', ')}`);
          return;
        }

        // Validate task names
        const invalidTasks = tasks.filter(taskText => 
          !/^[\p{L}\d_-]+$/u.test(taskText)
        );

        if (invalidTasks.length > 0) {
          alert(`Invalid task names: ${invalidTasks.join(', ')}. Tasks must be single words without spaces/special chars.`);
          return;
        }

        // Fetch existing tasks to check for server-side duplicates
        const existingTasksResponse = await axios.get('http://localhost:5000/api/tasks', { withCredentials: true });
        const existingTaskNames = new Set(
          existingTasksResponse.data.map(task => task.name.toLowerCase())
        );

        const duplicatesInServer = tasks.filter(task => 
          existingTaskNames.has(task.toLowerCase())
        );

        if (duplicatesInServer.length > 0) {
          alert(`Tasks already exist: ${duplicatesInServer.join(', ')}`);
          return;
        }

        const taskUpdates = tasks.map(taskText => ({
          name: taskText,
          employee: '',
          date: new Date().toISOString().split('T')[0],
          comments: '',
          status: 'pending',
          department: '',
          email: ''
        }));

        const response = await axios.post(
          'http://localhost:5000/api/tasks/bulk',
          { tasks: taskUpdates },
          {
            withCredentials: true,
            validateStatus: (status) => status === 200 || status === 201
          }
        );

        // Handle response with user-friendly messages
        if (response.status === 201) {
          const { addedCount, duplicates } = response.data;
          alert(duplicates > 0 
            ? `Added ${addedCount} tasks. ${duplicates} duplicates skipped.`
            : `Successfully added ${addedCount} tasks`
          );
        }
      }

      // Employee Department Updates
      if (parsedEmployeeDepartment.length > 0) {
        const validPairs = parsedEmployeeDepartment
          .map(pair => ({
            employee: pair.employee?.trim() || '',
            department: pair.department?.trim() || '',
            email: pair.email?.trim().toLowerCase()
          }))
          .filter(pair => pair.employee && pair.department && pair.email);

        if (validPairs.length > 0) {
          await axios.put(
            'http://localhost:5000/api/employee-departments',
            { updates: validPairs },
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Reset form state
      setBulkTasks('');
      setBulkEmployeeDepartment('');
      setParsedTasks([]);
      setParsedEmployeeDepartment([]);
      
      // Trigger data refresh
      fetchData();
      onDataSaved();

    } catch (error) {
      console.error('Bulk submission error:', error);
      alert(error.message || 'Bulk submission failed');
    }
  }, [bulkTasks, parsedEmployeeDepartment, fetchData, onDataSaved]);

  // Handle delete all data
  const handleDeleteAllData = async () => {
    try {
      const response = await axios.delete('http://localhost:5000/api/tasks/all');
      if (response.status === 200) {
        alert('All data has been successfully deleted');
        // Reset any local state if needed
        setParsedTasks([]);
        setParsedEmployeeDepartment([]);
        setBulkTasks('');
        setBulkEmployeeDepartment('');
        setTask({
          taskName: '',
          employee: '',
          department: '',
          mail: '',
          date: '',
          comments: ''
        });

        // Refresh the page
        window.location.reload();
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      alert('Failed to delete data. Please try again.');
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        name: task.taskName,
        employee: task.employee,
        date: task.date,
        comments: task.comments,
        status: task.status,
        department: task.department,
        email: task.mail,
        id: task.id
      };

      console.log('Submitting task:', taskData);

      const response = await axios.put(`http://localhost:5000/api/tasks/${task.id}`, taskData, {
        withCredentials: true,  // Ensure credentials are sent
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Task saved successfully:', response.data);
      
      // Update tasks in parent component
      const updatedTask = response.data.task;
      const updatedTasks = tasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      );
      setTasks(updatedTasks);

      // Reset form
      setTask({
        taskName: '',
        employee: '',
        department: '',
        mail: '',
        date: '',
        comments: ''
      });
      onDataSaved();
    } catch (error) {
      console.error('Error saving task:', error);
      alert(`Error saving task: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleCheckTask = (taskId) => {
    const newChecked = new Set(checkedTasks);
    if (newChecked.has(taskId)) {
      newChecked.delete(taskId);
    } else {
      newChecked.add(taskId);
    }
    setCheckedTasks(newChecked);
  };

  return (
    <div className="container mx-auto p-4 bg-[#f5f5f5]">
      {/* Bulk Inputs Section */}
      <div className="max-w-7xl mx-auto mb-6 bg-white rounded p-6">
        <h2 className="text-xl font-semibold mb-6 text-center">Bulk Data Input</h2>
        
        <div className="flex space-x-6">
          {/* Bulk Tasks Input */}
          <div className="w-1/2">
            <label 
              htmlFor="bulkTasks" 
              className="block text-gray-700 text-sm font-medium mb-2"
            >
              Bulk Tasks Input (one task per line)
            </label>
            <textarea
              id="bulkTasks"
              value={bulkTasks}
              onChange={handleBulkTasksChange}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-gray-400"
              rows="4"
              placeholder="Enter multiple tasks, one per line"
            />
            <p className="text-sm text-gray-500 mt-1">
              {parsedTasks.length} tasks ready to be saved
            </p>
          </div>

          {/* Employee-Department Input */}
          <div className="w-1/2">
            <label 
              htmlFor="bulkEmployeeDepartment" 
              className="block text-gray-700 text-sm font-medium mb-2"
            >
              Employee-Department-Mail Input (format: employee;department;email)
            </label>
            <textarea
              id="bulkEmployeeDepartment"
              value={bulkEmployeeDepartment}
              onChange={handleBulkEmployeeDepartmentChange}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-gray-400"
              rows="4"
              placeholder="Enter employee, department and email, one per line (e.g., John Doe;Sales;john.doe@example.com)"
            />
            <p className="text-sm text-gray-500 mt-1">
              {parsedEmployeeDepartment.length} employee-department-mail entries ready to be saved
            </p>
          </div>
        </div>

        {/* Save and Delete Buttons */}
        <div className="flex justify-center space-x-4 mt-6">
          <button
            type="button"
            onClick={handleBulkDataSubmission}
            className="w-48 bg-black hover:bg-gray-800 text-white font-medium py-2 px-6 rounded"
            disabled={bulkTasks.length === 0 && parsedEmployeeDepartment.length === 0}
          >
            Save Bulk Data
          </button>
          
          <button
            type="button"
            onClick={handleDeleteAllData}
            className="w-48 bg-[#ff4d4f] hover:bg-[#ff7875] text-white font-medium py-2 px-6 rounded"
          >
            Delete All Items
          </button>
        </div>
      </div>

      {/* Individual Task Form */}
      <div className="max-w-2xl mx-auto bg-white rounded p-6">
        <h2 className="text-xl font-semibold mb-6 text-center">Create Task</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Selection Dropdown */}
          <div>
            <label 
              htmlFor="taskName" 
              className="block text-gray-700 text-sm font-medium mb-2"
            >
              Select Task
            </label>
            <select
              id="taskName"
              name="taskName"
              value={task.taskName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-gray-400"
              required
            >
              <option value="">Select a task</option>
              {tasks.map((taskItem, index) => (
                <option 
                  key={taskItem.id || `new-task-${index}-${taskItem.name}`}
                  value={taskItem.name}
                >
                  {taskItem.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Dropdown */}
          <div>
            <label 
              htmlFor="employee" 
              className="block text-gray-700 text-sm font-medium mb-2"
            >
              Select Employee
            </label>
            <select
              id="employee"
              name="employee"
              value={task.employee}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-gray-400"
              required
            >
              <option value="">Select an employee</option>
              {uniqueEmployees.map((employee) => (
                <option 
                  key={`employee-${employee.id}`}
                  value={employee.name}
                >
                  {employee.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department Display */}
          <div>
            <label 
              htmlFor="department" 
              className="block text-gray-700 text-sm font-medium mb-2"
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
              className="w-full border border-gray-300 rounded p-2 bg-gray-50"
            />
          </div>

          {/* Mail Display */}
          <div>
            <label 
              htmlFor="mail" 
              className="block text-gray-700 text-sm font-medium mb-2"
            >
              Mail
            </label>
            <input
              type="email"
              id="mail"
              name="mail"
              value={
                parsedEmployeeDepartment.find(emp => emp.employee === task.employee)?.email || 
                employees.find(emp => emp.name === task.employee)?.email || 
                ''
              }
              readOnly
              className="w-full border border-gray-300 rounded p-2 bg-gray-50"
            />
          </div>

          {/* Date Input */}
          <div>
            <label 
              htmlFor="date" 
              className="block text-gray-700 text-sm font-medium mb-2"
            >
              Due Date
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={task.date}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-gray-400"
              required
            />
          </div>

          {/* Comments Input */}
          <div>
            <label 
              htmlFor="comments" 
              className="block text-gray-700 text-sm font-medium mb-2"
            >
              Comments
            </label>
            <textarea
              id="comments"
              name="comments"
              value={task.comments}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-gray-400"
              placeholder="Enter any additional comments"
              rows="4"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              className="w-48 bg-black hover:bg-gray-800 text-white font-medium py-2 px-6 rounded"
            >
              Update Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(TaskInput); 