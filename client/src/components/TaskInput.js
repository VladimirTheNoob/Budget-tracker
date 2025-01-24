import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TaskInput = () => {
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

  // State for fetched tasks and employees
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);

  // State for checked tasks
  const [checkedTasks, setCheckedTasks] = useState(new Set());

  const fetchData = async () => {
    try {
      // Fetch tasks
      console.log('Attempting to fetch tasks from:', 'http://localhost:5000/api/tasks');
      const tasksResponse = await axios.get('http://localhost:5000/api/tasks');
      console.log('Tasks Response:', tasksResponse);
      
      if (Array.isArray(tasksResponse.data)) {
        // Ensure all tasks have IDs
        const tasksWithIds = tasksResponse.data.map((task, index) => ({
          id: task.id || `task-${Date.now()}-${index}`, // Generate ID if missing
          ...task
        }));
        console.log(`Setting ${tasksWithIds.length} tasks`);
        setTasks(tasksWithIds);
      }

      // Fetch employees
      console.log('Fetching employees...');
      const employeesResponse = await axios.get('http://localhost:5000/api/employees');
      console.log('Employees Response:', employeesResponse);
      
      if (Array.isArray(employeesResponse.data)) {
        console.log('Setting employees:', employeesResponse.data);
        setEmployees(employeesResponse.data);
      }
      
      console.log('Employees fetched:', employeesResponse.data);

      // Fetch employee-department pairs
      const employeeDepartmentsResponse = await axios.get('http://localhost:5000/api/employee-departments');
      if (Array.isArray(employeeDepartmentsResponse.data)) {
        console.log('Setting employee-departments:', employeeDepartmentsResponse.data);
        setParsedEmployeeDepartment(employeeDepartmentsResponse.data);
      } else {
        console.log('No employee-departments data found, setting empty array');
        setParsedEmployeeDepartment([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    console.log('=== FETCHING TASKS AND EMPLOYEES DATA ===');
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
    // Parse employee-department-email triplets (split by new line and delimiter)
    const pairs = value.split('\n').filter(pair => pair.trim() !== '');
    const employeeDepartment = pairs.map(pair => {
      const [employee, department, email] = pair.split(';').map(item => item.trim());
      return { employee, department, email };
    });
    setParsedEmployeeDepartment(employeeDepartment);
  };

  // Handle task selection from parsed tasks
  const handleTaskSelection = (e) => {
    const { value } = e.target;
    setTask(prev => ({
      ...prev,
      taskName: value
    }));
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'taskName') {
      setTask(prev => ({
        ...prev,
        taskName: value
      }));
    } else if (name === 'employee') {
      // Find the selected employee to get their department and email
      const selectedEmployee = employees.find(emp => emp.name === value);
      setTask(prev => ({
        ...prev,
        employee: value,
        department: selectedEmployee ? selectedEmployee.department : '',
        mail: selectedEmployee ? selectedEmployee.email : ''
      }));
    } else {
      setTask(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle bulk data submission
  const handleBulkDataSubmission = async () => {
    try {
      console.log('=== BULK DATA SUBMISSION STARTED ===');

      // Check for duplicates in parsedTasks
      const taskDuplicates = parsedTasks.filter((task, index) => 
        parsedTasks.indexOf(task) !== index
      );

      // Check for duplicates in the existing tasks
      const existingTaskNames = tasks.map(task => task.name.toLowerCase());
      const newTaskNames = parsedTasks.map(task => task.trim().toLowerCase());
      const duplicateTasks = newTaskNames.filter(name => existingTaskNames.includes(name));

      if (taskDuplicates.length > 0 || duplicateTasks.length > 0) {
        let errorMessage = 'Duplicates found:\n';
        if (taskDuplicates.length > 0) {
          errorMessage += `Tasks in bulk input: ${taskDuplicates.join(', ')}\n`;
        }
        if (duplicateTasks.length > 0) {
          errorMessage += `Tasks already exist: ${duplicateTasks.join(', ')}\n`;
        }
        alert(errorMessage);
        return;
      }

      // Save tasks to database if there are any
      if (parsedTasks.length > 0) {
        console.log('Preparing bulk tasks data:', parsedTasks);
        const tasksData = parsedTasks.map(taskName => taskName.trim());
        
        try {
          const tasksResponse = await axios.post('http://localhost:5000/api/bulk-tasks', { 
            tasks: tasksData 
          });
          console.log('Bulk tasks saved successfully:', tasksResponse.data);
        } catch (error) {
          if (error.response?.data?.duplicates) {
            const duplicates = error.response.data.duplicates;
            alert(`Cannot create duplicate tasks:\n${duplicates.join('\n')}`);
            return;
          }
          throw error;
        }
      }

      // Save employee-department pairs if there are any
      if (parsedEmployeeDepartment.length > 0) {
        try {
          // Fetch existing employee-department pairs
          const existingEmployeeDepartmentsResponse = await axios.get('http://localhost:5000/api/employee-departments');
          const existingEmployeeDepartments = existingEmployeeDepartmentsResponse.data || [];

          // Combine existing pairs with new pairs
          const combinedEmployeeDepartments = [...existingEmployeeDepartments, ...parsedEmployeeDepartment];

          // Send combined data to the server
          const employeeResponse = await axios.post('http://localhost:5000/api/employee-departments', {
            employeeDepartments: combinedEmployeeDepartments
          });
          console.log('Employee-department pairs saved:', employeeResponse.data);
        } catch (error) {
          if (error.response?.data?.duplicates) {
            const duplicates = error.response.data.duplicates;
            alert(`Cannot create duplicate entries:\n${duplicates.join('\n')}`);
            return;
          }
          throw error;
        }
      }

      // Reset form fields
      setBulkTasks('');
      setBulkEmployeeDepartment('');
      setParsedTasks([]);
      setParsedEmployeeDepartment([]);

      // Show success message
      alert('All data has been successfully saved!');

      // Refresh the data
      await fetchData();

    } catch (error) {
      console.error('Error in bulk data submission:', error);
      const errorMessage = error.response?.data?.error || error.message;
      alert(`Failed to save data: ${errorMessage}\nPlease try again.`);
    }
  };

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
      // Find the selected task from the tasks list
      const selectedTask = tasks.find(t => t.name === task.taskName);

      // Check for duplicates if this is a new task (case-insensitive)
      if (!selectedTask) {
        const isDuplicate = tasks.some(t => t.name.toLowerCase() === task.taskName.toLowerCase());
        if (isDuplicate) {
          alert('A task with this name already exists. Please choose a different name.');
          return;
        }
      }
      
      const taskData = {
        id: selectedTask?.id, // Use the ID of the existing task if found
        name: task.taskName,
        employee: task.employee,
        department: employees.find(emp => emp.name === task.employee)?.department || '',
        date: task.date,
        status: selectedTask?.status || 'pending',
        comments: task.comments,
        email: employees.find(emp => emp.name === task.employee)?.email || ''
      };

      console.log('Submitting task:', taskData);

      let response;
      if (selectedTask?.id) {
        // Update existing task
        response = await axios.put(`http://localhost:5000/api/tasks/${selectedTask.id}`, taskData);
        console.log('Task updated:', response.data);
      } else {
        // Create new task
        response = await axios.post('http://localhost:5000/api/tasks', taskData);
        console.log('Task created:', response.data);
      }
      
      // Reset form after successful submission
      setTask({
        taskName: '',
        employee: '',
        mail: '',
        date: '',
        comments: ''
      });

      // Show success message
      alert(selectedTask?.id ? 'Task updated successfully!' : 'Task created successfully!');

      // Refresh tasks list
      const tasksResponse = await axios.get('http://localhost:5000/api/tasks');
      if (Array.isArray(tasksResponse.data)) {
        setTasks(tasksResponse.data);
      }
    } catch (error) {
      console.error('Error saving task:', error);
      const errorMessage = error.response?.data?.error || error.message;
      alert(`Error ${task.id ? 'updating' : 'creating'} task: ${errorMessage}\nPlease try again.`);
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
            disabled={parsedTasks.length === 0 && parsedEmployeeDepartment.length === 0}
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
              {employees.map((employee) => (
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

export default TaskInput; 