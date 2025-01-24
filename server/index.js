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
let employees = readJsonFile(employeesFile);
let employeeDepartments = [];

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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

app.post('/api/tasks', (req, res) => {
  try {
    const task = req.body;
    console.log('Received individual task:', task);
    tasks.push(task);
    writeJsonFile(tasksFile, tasks);
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.post('/api/bulk-tasks', (req, res) => {
  try {
    const { tasks: newTasks } = req.body;
    if (!newTasks || !Array.isArray(newTasks)) {
      return res.status(400).json({ error: 'Invalid tasks data' });
    }
    tasks = [...tasks, ...newTasks];
    writeJsonFile(tasksFile, tasks);
    res.status(201).json({ 
      message: 'Bulk tasks created successfully',
      tasksCount: newTasks.length,
      tasks: newTasks
    });
  } catch (error) {
    console.error('Error in bulk tasks:', error);
    res.status(500).json({ error: 'Failed to create bulk tasks' });
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

app.post('/api/employee-departments', (req, res) => {
  try {
    const { employeeDepartments: newPairs } = req.body;
    if (!newPairs || !Array.isArray(newPairs)) {
      return res.status(400).json({ error: 'Invalid employee-department pairs' });
    }

    const validPairs = newPairs.filter(pair => 
      pair && pair.employee && pair.department && pair.email
    );

    const updatedEmployees = validPairs.map((pair, index) => ({
      id: `emp-${Date.now()}-${index}`,
      name: pair.employee.trim(),
      department: pair.department.trim(),
      email: pair.email.trim(),
      position: 'Employee'
    }));

    writeJsonFile(employeesFile, updatedEmployees);
    employees = updatedEmployees;
    employeeDepartments = validPairs;

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
    res.status(200).json({ message: 'All data deleted successfully' });
  } catch (error) {
    console.error('Error deleting data:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

// Authentication Routes
app.get('/auth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.send'],
    accessType: 'offline',
    prompt: 'consent'
  })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.CLIENT_URL}/login`,
    failureMessage: true
  }),
  (req, res) => {
    res.redirect(process.env.CLIENT_URL);
  }
);

app.get('/auth/status', (req, res) => {
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user,
    session: req.session
  });
});

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
    '/api/bulk-tasks',
    '/api/employees',
    '/api/employee-departments',
    '/api/tasks/all',
    '/auth/google',
    '/auth/google/callback',
    '/auth/status',
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