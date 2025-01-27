require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const fs = require('fs');
const path = require('path');
const { oauth2Client } = require('./utils/googleAuth');
const { google } = require('googleapis');
const crypto = require('crypto');
const { 
  getUserRole, 
  setUserRole, 
  checkPermission 
} = require('./utils/rbac');
const { ROLES } = require('./config/roles');

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
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '[]');
      return [];
    }
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
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
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Change to false for development
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
    user: req.user?.emails?.[0]?.value || req.user?.email,
    userRole: req.user ? getUserRole(req.user.emails?.[0]?.value || req.user.email) : null,
    session: req.session
  });
  next();
});

// Task Management Routes
app.get('/api/tasks', checkPermission('tasks'), (req, res) => {
  try {
    const tasks = readJsonFile(tasksFile);
    // Ensure at least empty array is returned
    res.status(200).json(Array.isArray(tasks) ? tasks : []);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
  }
});

// PUT endpoint for updating tasks
app.put('/api/tasks/:taskId', checkPermission('tasks'), (req, res) => {
  try {
    console.log('=== PUT /api/tasks/:taskId called ===');
    console.log('Authenticated User:', {
      isAuthenticated: req.isAuthenticated(),
      user: req.user?.emails?.[0]?.value || req.user?.email,
      userRole: req.user ? getUserRole(req.user.emails?.[0]?.value || req.user.email) : null
    });

    // Additional authentication check
    if (!req.isAuthenticated()) {
      console.warn('Unauthorized: Not authenticated');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Task ID:', req.params.taskId);
    console.log('Update data:', req.body);
    
    // Read current tasks
    const tasks = readJsonFile(tasksFile);
    console.log('Current tasks count:', tasks.length);
    
    // Find task index (case-insensitive)
    const taskIndex = tasks.findIndex(t => 
      t.id === req.params.taskId || 
      t.name.toLowerCase() === req.body.name.toLowerCase()
    );
    console.log('Task index:', taskIndex);
    
    if (taskIndex === -1) {
      console.log('Task not found with ID or name:', req.params.taskId, req.body.name);
      return res.status(404).json({ 
        error: 'Task not found', 
        details: {
          searchId: req.params.taskId,
          searchName: req.body.name
        }
      });
    }

    // Update task while preserving the ID and adding updatedAt timestamp
    const updatedTask = {
      ...tasks[taskIndex],
      ...req.body,
      id: tasks[taskIndex].id, // Preserve original ID
      updatedAt: new Date().toISOString()
    };
    
    // Update tasks array
    tasks[taskIndex] = updatedTask;
    
    // Save to file
    writeJsonFile(tasksFile, tasks);
    
    console.log('Task updated successfully:', updatedTask);
    res.status(200).json({ 
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ 
      error: 'Failed to update task',
      details: error.message
    });
  }
});

app.post('/api/tasks', checkPermission('tasks'), (req, res) => {
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

app.post('/api/tasks/bulk', checkPermission('tasks'), (req, res) => {
  try {
    const { tasks: newTasks } = req.body;
    console.log('Received bulk tasks data:', req.body);
    
    if (!newTasks || !Array.isArray(newTasks)) {
      return res.status(400).json({ error: 'Invalid tasks data' });
    }

    // Ensure server preserves existing IDs during updates
    const tasksWithIds = newTasks.map(task => {
      // Keep existing ID if present
      const taskId = task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return {
        ...task,
        id: taskId,
        createdAt: task.createdAt || new Date().toISOString(),
        status: task.status || 'pending'
      };
    });

    // Update tasks array
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

// Employee Management Routes
app.get('/api/employees', checkPermission('employees'), (req, res) => {
  try {
    const employees = readJsonFile(employeesFile);
    // Filter out duplicates before sending
    const uniqueEmployees = employees.filter((emp, index, self) =>
      index === self.findIndex(e => 
        e.id === emp.id && 
        e.email.toLowerCase() === emp.email.toLowerCase()
      )
    );
    res.status(200).json(uniqueEmployees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Employee-Department Routes
app.get('/api/employee-departments', checkPermission('employees'), (req, res) => {
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

// Employee Department Management Routes
app.put('/api/employee-departments', (req, res) => {
  try {
    console.log('=== PUT /api/employee-departments called ===');
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty updates' });
    }

    // Read current employee departments
    let employeeDepartments = readJsonFile(employeeDepartmentsFile);
    let employees = readJsonFile(employeesFile);

    const updatedEntries = [];
    const updatedCount = 0;

    updates.forEach(update => {
      const { employee, department, email } = update;

      // Find existing entry by employee name
      const existingEntryIndex = employeeDepartments.findIndex(
        entry => entry.employee === employee
      );

      if (existingEntryIndex !== -1) {
        // Update existing entry
        employeeDepartments[existingEntryIndex] = {
          ...employeeDepartments[existingEntryIndex],
          department,
          email
        };
        updatedEntries.push(employeeDepartments[existingEntryIndex]);
      } else {
        // Create new entry
        const newEntry = {
          employee,
          department,
          email,
          id: `empd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        employeeDepartments.push(newEntry);
        updatedEntries.push(newEntry);
      }

      // Update or add to employees list
      const existingEmployeeIndex = employees.findIndex(
        emp => emp.name === employee
      );

      if (existingEmployeeIndex !== -1) {
        employees[existingEmployeeIndex] = {
          ...employees[existingEmployeeIndex],
          department,
          email
        };
      } else {
        employees.push({
          name: employee,
          department,
          email,
          id: `emp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });
      }
    });

    // Write updated data back to files
    writeJsonFile(employeeDepartmentsFile, employeeDepartments);
    writeJsonFile(employeesFile, employees);

    res.status(200).json({
      message: 'Employee departments updated successfully',
      updatedCount: updatedEntries.length,
      updatedEntries
    });
  } catch (error) {
    console.error('Error updating employee departments:', error);
    res.status(500).json({ 
      error: 'Failed to update employee departments', 
      details: error.message 
    });
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
app.post('/api/notifications/send', checkPermission('notifications'), async (req, res) => {
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

    // Ensure OAuth credentials are set
    if (!oauth2Client.credentials.access_token) {
      console.error('No access token available');
      return res.status(401).json({ error: 'No valid OAuth credentials' });
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const results = [];

    // Refresh token if needed
    try {
      await oauth2Client.refreshAccessToken();
    } catch (refreshError) {
      console.error('Token refresh error:', refreshError);
      return res.status(401).json({ 
        error: 'Failed to refresh access token', 
        details: refreshError.message 
      });
    }

    for (const notification of notifications) {
      try {
        const emailContent = `From: ${req.user.email}
To: ${notification.email}
Subject: =?UTF-8?B?${Buffer.from(notification.taskName, 'utf8').toString('base64')}?=
Content-Type: text/plain; charset=utf-8
MIME-Version: 1.0

${notification.message}

Task Details:
- Task: ${notification.taskName}
- Employee: ${notification.employeeName}`;

        const encodedEmail = Buffer.from(emailContent, 'utf8')
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

// Modify the bulk task endpoint to prevent duplicates
app.post('/api/tasks/bulk', (req, res) => {
  try {
    const existingTasks = readJsonFile(tasksFile);
    const existingNames = new Set(existingTasks.map(t => t.name.toLowerCase()));
    
    const newTasks = req.body.tasks.filter(task => 
      !existingNames.has(task.name.toLowerCase())
    );

    if (newTasks.length === 0) {
      return res.status(200).json({
        error: 'DUPLICATE_TASKS',
        message: `All ${req.body.tasks.length} tasks already exist`,
        duplicates: req.body.tasks.length
      });
    }

    const tasksWithIds = newTasks.map(task => ({
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      createdAt: new Date().toISOString()
    }));

    writeJsonFile(tasksFile, [...existingTasks, ...tasksWithIds]);
    
    res.status(201).json({
      message: `Added ${tasksWithIds.length} new tasks`,
      addedCount: tasksWithIds.length,
      duplicates: req.body.tasks.length - tasksWithIds.length
    });
  } catch (error) {
    console.error('Bulk task error:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
});

// RBAC Management Routes
app.get('/api/roles', checkPermission('roles'), (req, res) => {
  try {
    const userEmail = req.user.emails?.[0]?.value || req.user.email;
    const currentUserRole = getUserRole(userEmail);

    // Only admins can list all roles
    if (currentUserRole !== ROLES.ADMIN) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const rolesFile = path.join(__dirname, 'storage/user-roles.json');
    const userRoles = readJsonFile(rolesFile);
    res.json(userRoles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

app.put('/api/roles', checkPermission('roles'), (req, res) => {
  try {
    const { email, role } = req.body;
    const userEmail = req.user.emails?.[0]?.value || req.user.email;
    const currentUserRole = getUserRole(userEmail);

    // Only admins can modify roles
    if (currentUserRole !== ROLES.ADMIN) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    setUserRole(email, role);
    res.json({ 
      message: 'Role updated successfully', 
      userRole: { email, role } 
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Modify authentication status route to include role
app.get('/auth/status', (req, res) => {
  console.log('Auth Status Request:', {
    isAuthenticated: req.isAuthenticated(),
    user: req.user,
    session: req.session
  });

  if (req.isAuthenticated()) {
    const userEmail = req.user.emails?.[0]?.value || req.user.email;
    const userRole = getUserRole(userEmail);
    
    console.log('Authenticated User:', {
      email: userEmail,
      role: userRole
    });
    
    res.json({
      authenticated: true,
      user: {
        ...req.user,
        email: userEmail
      },
      role: userRole || (userEmail === 'belyakovvladimirs@gmail.com' ? ROLES.ADMIN : ROLES.EMPLOYEE)
    });
  } else {
    console.log('Not Authenticated');
    res.json({
      authenticated: false,
      user: null,
      role: null
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