const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

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

// Basic route to verify server is working
app.get('/', (req, res) => {
  console.log('Root route accessed');
  res.status(200).json({ 
    message: 'Server is running',
    routes: [
      '/api/bulk-tasks',
      '/api/employee-departments',
      '/api/tasks',
      '/api/employees'  // Explicitly list employees route
    ]
  });
});

// Mock data storage (replace with database later)
let tasks = [];
let employeeDepartments = [];

// Mock employee data (replace with database query later)
const employees = [
  { id: 1, name: 'John Doe' },
  { id: 2, name: 'Jane Smith' },
  // Add more employee objects as needed
];

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
    const { employeeDepartments: newPairs } = req.body;
    console.log('Received employee-department pairs:', newPairs);
    
    // Store employee-department pairs (replace with database operation)
    employeeDepartments = [...employeeDepartments, ...newPairs];
    
    res.status(201).json({ 
      message: 'Employee-department pairs created successfully', 
      pairsCount: newPairs.length 
    });
  } catch (error) {
    console.error('Error creating employee-department pairs:', error);
    res.status(500).json({ error: 'Failed to create employee-department pairs' });
  }
});

// Individual task route
app.post('/api/tasks', (req, res) => {
  try {
    const task = req.body;
    console.log('Received individual task:', task);
    
    // Store task (replace with database operation)
    tasks.push(task);
    
    res.status(201).json({ 
      message: 'Task created successfully', 
      task 
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get all tasks
app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

// Get all employee-department pairs
app.get('/api/employee-departments', (req, res) => {
  res.json(employeeDepartments);
});

// Enhanced route logging function
function logRoutesComprehensively(app) {
  console.log('=== COMPREHENSIVE ROUTE REGISTRATION ===');
  app._router.stack.forEach(function(middleware){
    if (middleware.route) {
      // Routes
      console.log(`Route: ${Object.keys(middleware.route.methods).join(', ')} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      // Router-level middleware
      middleware.handle.stack.forEach(function(handler){
        if (handler.route) {
          console.log(`Nested Route: ${Object.keys(handler.route.methods).join(', ')} ${handler.route.path}`);
        }
      });
    }
  });
  console.log('=== END COMPREHENSIVE ROUTE REGISTRATION ===');
}

// Detailed CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Ensure employees route is explicitly and thoroughly logged
console.log('=== REGISTERING /api/employees ROUTE ===');
app.get('/api/employees', (req, res) => {
  console.log('=== GET /api/employees ROUTE HANDLER ===');
  console.log('Received Request Headers:', req.headers);
  console.log('Server-side Employees Data:', employees);
  
  // Add CORS headers manually for extra safety
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  res.status(200).json(employees);
});
console.log('=== /api/employees ROUTE REGISTERED ===');

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