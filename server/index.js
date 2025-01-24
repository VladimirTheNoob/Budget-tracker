require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const fs = require('fs');
const path = require('path');
const { oauth2Client } = require('./utils/googleAuth');
const { google } = require('googleapis');

const app = express();
const port = process.env.PORT || 5000;

// Create storage directory if it doesn't exist
const storageDir = path.join(__dirname, 'storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir);
  console.log('Storage directory created:', storageDir);
}

// File paths for storage
const tasksFile = path.join(storageDir, 'tasks.json');
const employeesFile = path.join(storageDir, 'employees.json');
const employeeDepartmentsFile = path.join(storageDir, 'employee-departments.json');

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

// Create employee-departments.json file if it doesn't exist
if (!fs.existsSync(employeeDepartmentsFile)) {
  fs.writeFileSync(employeeDepartmentsFile, '[]', 'utf8');
  console.log('employee-departments.json file created');
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
let employees = readJsonFile(employeesFile);
let employeeDepartments = readJsonFile(employeeDepartmentsFile);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport
require('./utils/googleAuth').configurePassport();

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    authenticated: req.isAuthenticated(),
    user: req.user,
    session: req.session
  });
  next();
});

// Task Management Routes
app.get('/api/tasks', (req, res) => {
  try {
    console.log('Sending tasks:', tasks);
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// PUT endpoint for updating tasks
app.put('/api/tasks/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const taskData = req.body;
    console.log('PUT /api/tasks/:taskId called with:', { taskId, taskData });

    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      console.log('Task not found:', taskId);
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update existing task while preserving any existing fields not included in the update
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...taskData,
      id: taskId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    writeJsonFile(tasksFile, tasks);
    console.log('Task updated:', tasks[taskIndex]);
    res.status(200).json({ 
      message: 'Task updated successfully',
      task: tasks[taskIndex]
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const taskData = req.body;
    console.log('Received task data:', taskData);

    // Check if this is an update (has an ID)
    if (taskData.id) {
      const taskIndex = tasks.findIndex(t => t.id === taskData.id);
      if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Update existing task
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        ...taskData,
        updatedAt: new Date().toISOString()
      };

      writeJsonFile(tasksFile, tasks);
      console.log('Task updated:', tasks[taskIndex]);
      res.status(200).json({ 
        message: 'Task updated successfully',
        task: tasks[taskIndex]
      });
    } else {
      // Check for duplicate task name
      const isDuplicateTask = tasks.some(t => t.name === taskData.name);
      if (isDuplicateTask) {
        return res.status(400).json({ error: 'A task with this name already exists' });
      }

      // Create new task
      const newTask = {
        ...taskData,
        id: `task-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      tasks.push(newTask);
      writeJsonFile(tasksFile, tasks);
      console.log('New task created:', newTask);
      res.status(201).json({ 
        message: 'Task created successfully',
        task: newTask
      });
    }
  } catch (error) {
    console.error('Error handling task:', error);
    res.status(500).json({ error: 'Failed to handle task operation' });
  }
});

app.post('/api/bulk-tasks', (req, res) => {
  try {
    const { tasks: newTasks } = req.body;
    console.log('Received bulk tasks data:', req.body);
    
    if (!newTasks || !Array.isArray(newTasks)) {
      return res.status(400).json({ error: 'Invalid tasks data' });
    }

    // Extract task names if they're objects, otherwise use as is
    const taskNames = newTasks.map(task => 
      typeof task === 'object' ? task.name : task
    );

    // Check for duplicates within new tasks first
    const newTasksSet = new Set();
    const duplicatesInNew = [];
    taskNames.forEach(taskName => {
      if (newTasksSet.has(taskName.toLowerCase())) {
        duplicatesInNew.push(taskName);
      }
      newTasksSet.add(taskName.toLowerCase());
    });

    if (duplicatesInNew.length > 0) {
      return res.status(400).json({
        error: 'Duplicate tasks found in new data',
        duplicates: duplicatesInNew
      });
    }

    // Check for duplicates with existing tasks
    const existingTaskNames = new Set(tasks.map(t => t.name.toLowerCase()));
    const duplicatesWithExisting = taskNames.filter(taskName => 
      existingTaskNames.has(taskName.toLowerCase())
    );

    if (duplicatesWithExisting.length > 0) {
      return res.status(400).json({
        error: 'Tasks already exist',
        duplicates: duplicatesWithExisting
      });
    }

    // Add IDs and timestamps to new tasks
    const tasksWithIds = taskNames.map(taskName => ({
      name: taskName,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      status: 'pending'
    }));

    // Update tasks
    tasks = [...tasks, ...tasksWithIds];
    writeJsonFile(tasksFile, tasks);
    
    console.log('Bulk tasks created:', tasksWithIds);
    res.status(201).json({ 
      message: 'Bulk tasks created successfully',
      tasksCount: tasksWithIds.length,
      tasks: tasksWithIds
    });
  } catch (error) {
    console.error('Error in bulk tasks:', error);
    res.status(500).json({ error: 'Failed to create bulk tasks: ' + error.message });
  }
});

// Add task update endpoint
app.post('/api/tasks/update', (req, res) => {
  try {
    const updatedTask = req.body;
    console.log('Updating task:', updatedTask);

    if (!updatedTask.id) {
      return res.status(400).json({ error: 'Task ID is required for update' });
    }

    const taskIndex = tasks.findIndex(task => task.id === updatedTask.id);
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update the task while preserving any existing fields not included in the update
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...updatedTask,
      updatedAt: new Date().toISOString()
    };

    writeJsonFile(tasksFile, tasks);
    console.log('Task updated successfully:', tasks[taskIndex]);
    res.status(200).json({ 
      message: 'Task updated successfully', 
      task: tasks[taskIndex] 
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Employee Management Routes
app.get('/api/employees', (req, res) => {
  try {
    const currentEmployees = readJsonFile(employeesFile);
    res.status(200).json(currentEmployees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Employee-Department Routes
app.get('/api/employee-departments', (req, res) => {
  console.log('=== GET /api/employee-departments called ===');
  try {
    const currentEmployeeDepartments = readJsonFile(employeeDepartmentsFile);
    console.log('Current employee-departments:', currentEmployeeDepartments);
    res.status(200).json(currentEmployeeDepartments || []);
  } catch (error) {
    console.error('Error fetching employee-departments:', error);
    res.status(500).json({ error: 'Failed to fetch employee-departments' });
  }
});

app.post('/api/employee-departments', (req, res) => {
  console.log('=== POST /api/employee-departments called ===');
  try {
    const { employeeDepartments: newPairs } = req.body;
    console.log('Received new pairs:', newPairs);

    if (!newPairs || !Array.isArray(newPairs)) {
      console.log('Invalid input: not an array');
      return res.status(400).json({ error: 'Invalid employee-department pairs' });
    }

    // Log current state
    console.log('Current employees:', employees);
    console.log('Current employee-departments:', employeeDepartments);

    // Filter valid pairs
    const validPairs = newPairs.filter(pair => 
      pair && pair.employee && pair.department && pair.email
    );
    console.log('Valid pairs:', validPairs);

    // Create new employees without duplicate checking
    const updatedEmployees = validPairs.map((pair, index) => ({
      id: `emp-${Date.now()}-${index}`,
      name: pair.employee.trim(),
      department: pair.department.trim(),
      email: pair.email.trim(),
      position: 'Employee'
    }));

    // Update both employees and employee-departments files
    writeJsonFile(employeesFile, [...employees, ...updatedEmployees]);
    writeJsonFile(employeeDepartmentsFile, [...employeeDepartments, ...validPairs]);
    
    // Update in-memory data
    employees = [...employees, ...updatedEmployees];
    employeeDepartments = [...employeeDepartments, ...validPairs];

    console.log('Successfully updated employee-departments');
    console.log('New employees:', updatedEmployees);
    
    res.status(201).json({ 
      message: 'Employee-department pairs created successfully',
      employees: updatedEmployees
    });
  } catch (error) {
    console.error('Error creating employee-department pairs:', error);
    res.status(500).json({ error: 'Failed to create employee-department pairs' });
  }
});

// Delete all data
app.delete('/api/tasks/all', (req, res) => {
  try {
    tasks = [];
    employees = [];
    employeeDepartments = [];
    writeJsonFile(tasksFile, []);
    writeJsonFile(employeesFile, []);
    writeJsonFile(employeeDepartmentsFile, []);
    res.status(200).json({ message: 'All data deleted successfully' });
  } catch (error) {
    console.error('Error deleting data:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

// Authentication Routes
const authRouter = express.Router();

// Debug middleware for auth routes
authRouter.use((req, res, next) => {
  console.log('Auth route accessed:', req.path);
  next();
});

authRouter.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.send'],
    accessType: 'offline',
    prompt: 'consent'
  })
);

authRouter.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.CLIENT_URL}/login`,
    failureMessage: true
  }),
  (req, res) => {
    res.redirect(process.env.CLIENT_URL);
  }
);

authRouter.get('/status', (req, res) => {
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user,
    session: req.session
  });
});

// Logout handler function
function handleLogout(req, res) {
  console.log('Logout request received');
  try {
    req.logout((err) => {
      if (err) {
        console.error('Error during logout:', err);
        return res.status(500).json({ error: 'Failed to logout' });
      }

      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ error: 'Failed to destroy session' });
          }
          res.clearCookie('connect.sid', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          });
          console.log('Logout successful');
          res.json({ message: 'Logged out successfully' });
        });
      } else {
        console.log('No session to destroy');
        res.json({ message: 'Logged out successfully' });
      }
    });
  } catch (error) {
    console.error('Error in logout route:', error);
    res.status(500).json({ error: 'Internal server error during logout' });
  }
}

// Handle both GET and POST for logout
authRouter.post('/logout', handleLogout);
authRouter.get('/logout', handleLogout);

// Use the auth router
app.use('/auth', authRouter);

// Notification Route
app.post('/api/notifications/send', async (req, res) => {
  try {
    console.log('=== SEND NOTIFICATIONS ROUTE HANDLER CALLED ===');
    const { notifications } = req.body;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!notifications || !Array.isArray(notifications)) {
      console.error('Invalid notifications data:', req.body);
      return res.status(400).json({ 
        error: 'Invalid notifications data. Expected an array of notifications.',
        receivedBody: req.body
      });
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const results = [];

    for (const notification of notifications) {
      try {
        const emailContent = `From: ${req.user.email}
To: ${notification.email}
Subject: Task Update: ${notification.taskName}
Content-Type: text/plain; charset=utf-8
MIME-Version: 1.0

${notification.message}

Task Details:
- Task: ${notification.taskName}
- Employee: ${notification.employeeName}`;

        const encodedEmail = Buffer.from(emailContent)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedEmail
          }
        });

        results.push({
          success: true,
          email: notification.email,
          message: 'Notification sent successfully'
        });
      } catch (error) {
        console.error(`Failed to send notification to ${notification.email}:`, error);
        results.push({
          success: false,
          email: notification.email,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.status(200).json({
      message: `Notifications processed: ${successCount} successful, ${failureCount} failed`,
      results
    });
  } catch (error) {
    console.error('Error in notifications endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error while processing notifications',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Error handling for undefined routes
app.use((req, res) => {
  const availableRoutes = [
    '/api/tasks',
    '/api/tasks/:taskId',  // PUT endpoint for updating tasks
    '/api/tasks/update',
    '/api/bulk-tasks',
    '/api/employees',
    '/api/employee-departments',
    '/api/tasks/all',
    '/auth/google',
    '/auth/google/callback',
    '/auth/status',
    '/auth/logout',
    '/api/notifications/send'
  ];
  
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.path} does not exist`,
    availableRoutes
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 