import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TaskList = ({ refreshTrigger, tasks, employees }) => {
  const [filters, setFilters] = useState({
    status: 'all',
    employee: 'all',
    department: 'all',
  });
  const [groupBy, setGroupBy] = useState('none'); // none, employee, department
  const [checkedTasks, setCheckedTasks] = useState(new Set());
  const [notificationText, setNotificationText] = useState('');
  const [uniqueTasks, setUniqueTasks] = useState([]);
  const [bulkTaskInput, setBulkTaskInput] = useState('');

  // Add deduplication for employees
  const uniqueEmployees = [...new Map(employees.map(emp => 
    [emp.id, emp]
  )).values()];

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  useEffect(() => {
    const seen = new Set();
    const filtered = tasks.filter(task => {
      const duplicate = seen.has(task.taskName);
      seen.add(task.taskName);
      return !duplicate;
    });
    setUniqueTasks(filtered);
  }, [tasks]);

  const fetchData = async () => {
    try {
      const [tasksRes, employeesRes] = await Promise.all([
        axios.get('http://localhost:5000/api/tasks'),
        axios.get('http://localhost:5000/api/employees')
      ]);
      
      // Process data but don't set state - it comes from props
      const tasksWithIds = tasksRes.data.map((task, index) => ({
        ...task,
        id: task.id || `task-${Date.now()}-${index}`,
        taskName: task.name
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filterTasks = (tasks) => {
    return tasks.filter(task => {
      if (filters.status !== 'all' && task.status !== filters.status) return false;
      if (filters.employee !== 'all' && task.employee !== filters.employee) return false;
      if (filters.department !== 'all' && task.department !== filters.department) return false;
      return true;
    });
  };

  const groupTasks = (tasks) => {
    if (groupBy === 'none') return { 'All Tasks': tasks };
    
    return tasks.reduce((groups, task) => {
      const key = task[groupBy] || 'Unassigned';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
      return groups;
    }, {});
  };

  const getUniqueDepartments = () => {
    return [...new Set(employees.map(emp => emp.department))];
  };

  const filteredTasks = filterTasks(tasks);
  const groupedTasks = groupTasks(filteredTasks);

  const handleCheckTask = (taskId) => {
    setCheckedTasks(prev => {
      const newChecked = new Set(prev);
      if (newChecked.has(taskId)) {
        newChecked.delete(taskId);
      } else {
        newChecked.add(taskId);
      }
      return newChecked;
    });
  };

  const handleSendNotifications = async () => {
    if (checkedTasks.size === 0) {
      alert('Please select at least one task to send notifications');
      return;
    }

    if (!notificationText.trim()) {
      alert('Please enter notification text');
      return;
    }

    try {
      // Check authentication status first
      const authResponse = await axios.get('http://localhost:5000/auth/status', { 
        withCredentials: true 
      });

      if (!authResponse.data.authenticated) {
        alert('Please log in to send notifications');
        return;
      }

      // Get selected tasks with their employee emails
      const selectedTasks = tasks.filter(task => checkedTasks.has(task.id));
      const notifications = selectedTasks.map(task => {
        const employeeEmail = employees.find(emp => emp.name === task.employee)?.email;
        if (!employeeEmail) {
          throw new Error(`No email found for employee: ${task.employee}`);
        }
        return {
          taskId: task.id,
          taskName: task.name,
          employeeName: task.employee,
          email: employeeEmail,
          message: notificationText
        };
      });

      console.log('Preparing to send notifications:', notifications);

      // Send notifications to the backend with credentials
      const response = await axios.post(
        'http://localhost:5000/api/notifications/send', 
        { notifications },
        { 
          withCredentials: true,  // Include cookies for authentication
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Notifications sent:', response.data);
      
      // Check response structure and handle accordingly
      const successCount = response.data.results?.filter(r => r.success).length || 0;
      const failedCount = response.data.results?.filter(r => !r.success).length || 0;

      if (successCount > 0) {
        const successEmails = response.data.results
          .filter(r => r.success)
          .map(r => r.email);
        
        alert(`Notifications sent successfully:\n\n${successEmails.join('\n')}`);
        
        // Clear selections and text
        setCheckedTasks(new Set());
        setNotificationText('');
      } else {
        alert('No notifications were sent. Please check your selection and try again.');
      }

      // Log any failed notifications
      if (failedCount > 0) {
        const failedNotifications = response.data.results
          .filter(r => !r.success)
          .map(r => `${r.email}: ${r.error}`);
        
        console.warn('Failed notifications:', failedNotifications);
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      
      // More detailed error handling
      if (error.response) {
        // The request was made and the server responded with a status code
        const errorMessage = error.response.data?.error || 
                             error.response.data?.message || 
                             'Unknown server error';
        
        alert(`Failed to send notifications: ${errorMessage}`);
      } else if (error.request) {
        // The request was made but no response was received
        alert('No response received from the server. Please check your network connection.');
      } else {
        // Something happened in setting up the request
        alert(`Error: ${error.message}`);
      }
    }
  };

  const handleBulkDataSubmission = async () => {
    try {
      console.log('=== BULK DATA SUBMISSION STARTED ===');
      
      // Process employee-department updates first
      if (parsedEmployeeDepartment.length > 0) {
        try {
          // Create valid pairs with proper scoping and normalization
          const validPairs = parsedEmployeeDepartment.map(pair => ({
            employee: pair.employee?.trim() || '',
            department: pair.department?.trim() || '',
            email: pair.email?.trim().toLowerCase()
          })).filter(pair => pair.employee && pair.department && pair.email);

          console.log('Sending employee updates:', validPairs);
          
          // Send updates using PUT request
          const employeeResponse = await axios.put(
            'http://localhost:5000/api/employee-departments',
            { updates: validPairs },
            { 
              headers: { 'Content-Type': 'application/json' },
              withCredentials: true
            }
          );

          if (employeeResponse.status === 200) {
            console.log('Successfully updated employee-departments');
            console.log('Updated entries:', employeeResponse.data.updatedEntries);
            
            // Refresh employee data after update
            await fetchData();
            
            // Show success message with details
            if (employeeResponse.data.updatedCount > 0) {
              alert(`Updated ${employeeResponse.data.updatedCount} employee entries`);
            }
          }

        } catch (error) {
          console.error('Update error:', error);
          alert(error.response?.data?.error || 'Update failed');
          return;
        }
      }
      // ... rest of the method remains the same
    } catch (error) {
      // Error handling
      alert(error.message || 'Failed to submit bulk tasks');
      console.error('Bulk task submission error:', error);
    }
  };

  return (
    <div className="container mx-auto p-4 bg-[#f5f5f5]">
      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-6 bg-white rounded p-6">
        <h2 className="text-xl font-semibold mb-6 text-center">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-gray-400"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Employee
            </label>
            <select
              value={filters.employee}
              onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-gray-400"
            >
              <option value="all">All Employees</option>
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

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Department
            </label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-gray-400"
            >
              <option value="all">All Departments</option>
              {getUniqueDepartments().map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Group By
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-gray-400"
            >
              <option value="none">No Grouping</option>
              <option value="employee">Employee</option>
              <option value="department">Department</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Section */}
      <div className="max-w-7xl mx-auto mb-6 bg-white rounded p-6">
        <div className="flex space-x-4 items-end">
          <div className="flex-grow">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Notification Text
            </label>
            <textarea
              value={notificationText}
              onChange={(e) => setNotificationText(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-gray-400"
              rows="2"
              placeholder="Enter notification text to send to selected employees"
            />
          </div>
          <button
            onClick={handleSendNotifications}
            className="w-48 bg-black hover:bg-gray-800 text-white font-medium py-2 px-6 rounded"
            disabled={checkedTasks.size === 0 || !notificationText.trim()}
          >
            Send Notifications
          </button>
        </div>
      </div>

      {/* Tasks Table */}
      {Object.entries(groupedTasks).map(([group, tasks]) => (
        <div key={`group-${group}`} className="max-w-7xl mx-auto mb-6 bg-white rounded p-6">
          <div className="mb-4 border-b pb-4">
            <h3 className="text-lg font-semibold">{group}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Select
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actual end Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task, index) => {
                  const taskId = task.id || `task-${Date.now()}-${index}`;
                  return (
                    <tr 
                      key={`task-${taskId}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={checkedTasks.has(taskId)}
                          onChange={() => handleCheckTask(taskId)}
                          className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.employee}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.endDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(task.status)}`}>
                          {task.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskList; 