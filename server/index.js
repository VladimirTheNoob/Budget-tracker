const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Permissive CORS configuration for development
app.use(cors());

// Middleware for parsing JSON and logging requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log route registration
function logRoutes(app) {
  console.log('=== REGISTERED ROUTES ===');
  app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
      console.log(
        Object.keys(r.route.methods)
          .map(method => `${method.toUpperCase()} ${r.route.path}`)
          .join(', ')
      );
    }
  });
  console.log('=== END REGISTERED ROUTES ===');
}

// Detailed logging middleware
app.use((req, res, next) => {
  console.log('-------------------------------------------');
  console.log(`Incoming Request: ${req.method} ${req.path}`);
  console.log('Full Request Details:', {
    method: req.method,
    path: req.path,
    url: req.url,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    headers: req.headers,
    body: req.body
  });
  console.log('-------------------------------------------');
  next();
});

// Explicit route logging middleware
app.use((req, res, next) => {
  console.log(`Received request to: ${req.method} ${req.path}`);
  next();
});

// Debugging route registration
console.log('Registering routes...');

// Create storage directory if it doesn't exist
const storageDir = path.join(__dirname, 'storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir);
  console.log('Storage directory created:', storageDir);
}

// File paths for storage
const tasksFile = path.join(storageDir, 'tasks.json');
const employeesFile = path.join(storageDir, 'employees.json');

// Create tasks.json file if it doesn't exist
if (!fs.existsSync(tasksFile)) {
  fs.writeFileSync(tasksFile, '[]', 'utf8');
  console.log('tasks.json file created');
}

// Create employees.json file if it doesn't exist  
if (!fs.existsSync(employeesFile)) {
  fs.writeFileSync(employeesFile, '[]', 'utf8');
  console.log('employees.json file created');
}

// Helper function to read data from a JSON file
const readJsonFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
};

// Helper function to write data to a JSON file  
const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Data written to ${filePath}`);
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
  }
};

// Load initial data from JSON files
let tasks = readJsonFile(tasksFile);
console.log('Loaded tasks from file:', tasks);
let employees = readJsonFile(employeesFile);

// Declare employeeDepartments array at the top level
let employeeDepartments = [];

// Bulk tasks route with extensive logging and explicit path
app.post('/api/bulk-tasks', (req, res) => {
  console.log('=== BULK TASKS ROUTE HANDLER CALLED ===');
  console.log('Received Bulk Tasks Request:', {
    method: req.method,
    path: req.path,
    url: req.url,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    headers: req.headers,
    body: req.body
  });

  try {
    const { tasks: newTasks } = req.body;
    
    if (!newTasks || !Array.isArray(newTasks)) {
      console.error('Invalid tasks data:', req.body);
      return res.status(400).json({ 
        error: 'Invalid tasks data. Expected an array of tasks.',
        receivedBody: req.body
      });
    }

    console.log('Parsed tasks:', newTasks);
    
    // Store tasks (replace with database operation)
    tasks = [...tasks, ...newTasks];
    writeJsonFile(tasksFile, tasks);
    
    console.log('Updated tasks array:', tasks);

    res.status(201).json({ 
      message: 'Bulk tasks created successfully', 
      tasksCount: newTasks.length,
      tasks: newTasks
    });
  } catch (error) {
    console.error('Error in /api/bulk-tasks handler:', error);
    res.status(500).json({ 
      error: 'Failed to create bulk tasks', 
      details: error.message,
      stack: error.stack 
    });
  }
});

// Employee-departments route
app.post('/api/employee-departments', (req, res) => {
  try {
    console.log('=== EMPLOYEE-DEPARTMENTS ROUTE HANDLER CALLED ===');
    console.log('Received Request Body:', req.body);
    console.log('Current employees before update:', employees);

    const { employeeDepartments: newPairs } = req.body;
    
    // Validate input
    if (!newPairs || !Array.isArray(newPairs)) {
      console.error('Invalid employee-department pairs:', req.body);
      return res.status(400).json({ 
        error: 'Invalid employee-department pairs. Expected an array.',
        receivedBody: req.body
      });
    }

    // Validate each pair and create new employees
    const validPairs = newPairs.filter(pair => 
      pair.employee && pair.department
    );

    console.log('Validated employee-department pairs:', validPairs);
    
    // Update both employeeDepartments and employees arrays
    employeeDepartments = [...employeeDepartments, ...validPairs];
    
    // Add new employees if they don't exist
    validPairs.forEach((pair, index) => {
      const existingEmployee = employees.find(emp => 
        emp.name.toLowerCase() === pair.employee.toLowerCase()
      );
      
      if (!existingEmployee) {
        const newEmployee = {
          id: `emp-${Date.now()}-${index}`,
          name: pair.employee.trim(),
          department: pair.department.trim(),
          email: `${pair.employee.toLowerCase().replace(/\s+/g, '.')}@company.com`,
          position: 'Employee'
        };
        console.log('Adding new employee:', newEmployee);
        employees.push(newEmployee);
      } else {
        console.log('Employee already exists:', existingEmployee);
      }
    });

    console.log('Updated employees array:', employees);
    console.log(`Total employees after update: ${employees.length}`);
    
    writeJsonFile(employeesFile, employees);
    
    res.status(201).json({ 
      message: 'Employee-department pairs created successfully', 
      pairsCount: validPairs.length,
      pairs: validPairs,
      currentEmployees: employees,
      totalEmployees: employees.length
    });
  } catch (error) {
    console.error('Detailed Error in /api/employee-departments handler:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body
    });

    res.status(500).json({ 
      error: 'Failed to create employee-department pairs', 
      details: error.message,
      stack: error.stack 
    });
  }
});

// Individual task route
app.post('/api/tasks', (req, res) => {
  try {
    const task = req.body;
    console.log('Received individual task:', task);
    
    // Store task (replace with database operation)
    tasks.push(task);
    writeJsonFile(tasksFile, tasks);
    
    res.status(201).json({ 
      message: 'Task created successfully', 
      task 
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Enhanced routes for tasks
app.get('/api/tasks', (req, res) => {
  try {
    console.group('📤 Sending Tasks');
    
    // Ensure each task has required fields and a unique ID
    const processedTasks = tasks.map((task, index) => {
      const processedTask = {
        id: task.id || task._id || `task-${index}-${Date.now()}`,
        name: task.name || `Task ${index + 1}`,
        description: task.description || 'No description',
        // Preserve any other existing fields
        ...task
      };

      console.log('Processed task:', processedTask);
      return processedTask;
    });

    console.log('Sending tasks:', processedTasks);
    console.groupEnd();
    
    res.status(200).json(processedTasks);
  } catch (error) {
    console.error('Error processing tasks:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve tasks',
      details: error.message 
    });
  }
});

// Get all employee-department pairs
app.get('/api/employee-departments', (req, res) => {
  res.json(employeeDepartments);
});

// Enhanced route for employees
app.get('/api/employees', (req, res) => {
  console.log('=== FETCHING EMPLOYEES ===');
  console.log('Raw employees data:', employees);
  
  try {
    // Ensure each employee has required fields
    const processedEmployees = employees.map((emp, index) => ({
      id: emp.id || `emp-${index}-${Date.now()}`,
      name: emp.name || 'Unknown Employee',
      department: emp.department || 'Unassigned',
      ...emp
    }));
    
    console.log('Processed employees data:', processedEmployees);
    console.log('Number of employees:', processedEmployees.length);
    
    res.status(200).json(processedEmployees);
  } catch (error) {
    console.error('Error processing employees:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve employees',
      details: error.message 
    });
  }
});

// Detailed CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  res.status(500).json({ 
    error: 'An unexpected error occurred',
    message: err.message,
    stack: err.stack 
  });
});

// 404 handler - moved to the end of route definitions
app.use((req, res, next) => {
  console.error(`404 - Route Not Found: ${req.method} ${req.path}`);
  console.log('All Registered Routes:', app._router.stack
    .filter(r => r.route)
    .map(r => Object.keys(r.route.methods).map(method => `${method.toUpperCase()} ${r.route.path}`))
    .flat()
  );
  res.status(404).json({
    error: 'Route Not Found',
    requestedPath: req.path,
    availableRoutes: [
      '/api/bulk-tasks',
      '/api/employee-departments',
      '/api/tasks'
    ]
  });
});

console.log('Routes registered. Preparing to start server...');

const PORT = process.env.PORT || 5000;

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Listening on all network interfaces`);
  
  // Log all registered routes on startup
  logRoutes(app);
  
  // Additional diagnostic logging
  console.log('=== SERVER DIAGNOSTIC INFO ===');
  console.log('Registered Routes:', 
    app._router.stack
      .filter(r => r.route)
      .map(r => Object.keys(r.route.methods).map(method => `${method.toUpperCase()} ${r.route.path}`))
      .flat()
  );
  console.log('=== END SERVER DIAGNOSTIC INFO ===');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
}); 