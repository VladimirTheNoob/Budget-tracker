import React, { useState, useEffect } from 'react';
import axios from '../api';

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

  // State to store list of employees
  const [employees, setEmployees] = useState([]);

  // Fetch employees when component mounts
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        // Adjust the API endpoint as per your backend route
        const response = await axios.get('/employees');
        setEmployees(response.data);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    fetchEmployees();
  }, []);

  // Handle bulk tasks input
  const handleBulkTasksChange = (e) => {
    const value = e.target.value;
    setBulkTasks(value);
    // Parse tasks (split by new line)
    const tasks = value.split('\n').filter(task => task.trim() !== '');
    setParsedTasks(tasks);
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
    setTask(prevTask => ({
      ...prevTask,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Adjust the API endpoint as per your backend route
      const response = await axios.post('/tasks', task);
      console.log('Task created:', response.data);
      
      // Reset form after successful submission
      setTask({
        taskName: '',
        employee: '',
        date: '',
        comments: ''
      });
    } catch (error) {
      console.error('Error creating task:', error);
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
          <select
            id="taskName"
            name="taskName"
            value={task.taskName}
            onChange={handleTaskSelection}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          >
            <option value="">Select a task</option>
            {parsedTasks.map((task, index) => (
              <option key={index} value={task}>
                {task}
              </option>
            ))}
          </select>
        </div>

        {/* Employee Dropdown */}
        <div className="mb-4">
          <label 
            htmlFor="employee" 
            className="block text-gray-700 text-sm font-bold mb-2"
          >
            Employee
          </label>
          <select
            id="employee"
            name="employee"
            value={task.employee}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          >
            <option value="">Select an employee</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
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