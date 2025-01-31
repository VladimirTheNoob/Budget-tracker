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
  checkPermission,
  getEmployeeIdByEmail
} = require('./utils/rbac');
const { ROLES } = require('./config/roles');
const { configurePassport } = require('./utils/googleAuth');
const morgan = require('morgan');
const { logger, stream } = require('./utils/logger');
const { pool } = require('./config/database');
const pgSession = require('connect-pg-simple')(session);

const app = express();  
const port = process.env.PORT || 5000;

// Create storage directory if it doesn't exist
const storageDir = path.join(__dirname, 'storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir);
  logger.info('Storage directory created:', storageDir);
}

// File paths for storage
const tasksFile = path.join(storageDir, 'tasks.json');
const employeesFile = path.join(storageDir, 'employees.json');
const employeeDepartmentsFile = path.join(storageDir, 'employee-departments.json');
const goalsFile = path.join(storageDir, 'goals.json');

// Create tasks.json file if it doesn't exist
if (!fs.existsSync(tasksFile)) {
  fs.writeFileSync(tasksFile, '[]', 'utf8');
  logger.info('tasks.json file created');
}

// Create employees.json file if it doesn't exist  
if (!fs.existsSync(employeesFile)) {
  fs.writeFileSync(employeesFile, '[]', 'utf8');
  logger.info('employees.json file created');
}

// Create employee-departments.json file if it doesn't exist
if (!fs.existsSync(employeeDepartmentsFile)) {
  fs.writeFileSync(employeeDepartmentsFile, '[]', 'utf8');
  logger.info('employee-departments.json file created');
}

// Create goals.json file if it doesn't exist
if (!fs.existsSync(goalsFile)) {
  fs.writeFileSync(goalsFile, '[]', 'utf8');
  logger.info('goals.json file created');
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
    logger.error(`Error reading ${filePath}:`, error);
    return [];
  }
};

// Helper function to write data to a JSON file  
const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    logger.info(`Data written to ${filePath}`);
  } catch (error) {
    logger.error(`Error writing file ${filePath}:`, error);
  }
};

// Load initial data from JSON files
let tasks = readJsonFile(tasksFile);
let employees = readJsonFile(employeesFile);
let employeeDepartments = readJsonFile(employeeDepartmentsFile);

// Middleware
app.use(morgan('combined', { stream }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration with PostgreSQL store
app.use(session({
  store: new pgSession({
    pool,
    tableName: 'sessions'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : 'localhost'
  }
}));

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport
configurePassport();

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Debug middleware with improved logging
app.use((req, res, next) => {
  const userEmail = req.user?.emails?.[0]?.value || req.user?.email;
  logger.debug('Request details', {
    method: req.method,
    path: req.path,
    authenticated: req.isAuthenticated(),
    user: userEmail,
    userRole: req.user 
      ? getUserRole(getEmployeeIdByEmail(userEmail), userEmail) 
      : null,
    sessionId: req.sessionID
  });
  next();
});

// Authentication check middleware
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

// Task Management Routes
app.get('/api/tasks', ensureAuthenticated, checkPermission('tasks', 'read'), (req, res) => {
  try {
    const tasks = readJsonFile(tasksFile);
    // Ensure at least empty array is returned
    res.status(200).json(Array.isArray(tasks) ? tasks : []);
  } catch (error) {
    logger.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// PUT endpoint for updating tasks
app.put('/api/tasks/:taskId', checkPermission('tasks', 'write'), (req, res) => {
  try {
    logger.info('=== PUT /api/tasks/:taskId called ===');
    const userEmail = req.user?.emails?.[0]?.value || req.user?.email;
    logger.debug('Authenticated User:', {
      isAuthenticated: req.isAuthenticated(),
      user: userEmail,
      userRole: req.user 
        ? getUserRole(getEmployeeIdByEmail(userEmail), userEmail)
        : null
    });

    // Additional authentication check
    if (!req.isAuthenticated()) {
      logger.warn('Unauthorized: Not authenticated');
      return res.status(401).json({ error: 'Authentication required' });
    }

    logger.info('Task ID:', req.params.taskId);
    logger.info('Update data:', req.body);
    
    // Read current tasks
    const tasks = readJsonFile(tasksFile);
    logger.info('Current tasks count:', tasks.length);
    
    // Find task index (case-insensitive)
    const taskIndex = tasks.findIndex(t => 
      t.id === req.params.taskId || 
      t.name.toLowerCase() === req.body.name.toLowerCase()
    );
    logger.info('Task index:', taskIndex);
    
    if (taskIndex === -1) {
      logger.info('Task not found with ID or name:', req.params.taskId, req.body.name);
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
    
    logger.info('Task updated successfully:', updatedTask);
    res.status(200).json({ 
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    logger.error('Error updating task:', error);
    res.status(500).json({ 
      error: 'Failed to update task',
      details: error.message
    });
  }
});

app.post('/api/tasks', checkPermission('tasks', 'write'), (req, res) => {
  try {
    const taskData = req.body;
    logger.info('Received task data:', taskData);

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
      logger.info('Task updated:', tasks[taskIndex]);
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
      logger.info('New task created:', newTask);
      res.status(201).json({ 
        message: 'Task created successfully',
        task: newTask
      });
    }
  } catch (error) {
    logger.error('Error handling task:', error);
    res.status(500).json({ error: 'Failed to handle task operation' });
  }
});

app.post('/api/tasks/bulk', checkPermission('tasks', 'write'), (req, res) => {
  try {
    const { tasks: newTasks } = req.body;
    logger.info('Received bulk tasks data:', req.body);
    
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
    
    logger.info('Bulk tasks created:', tasksWithIds);
    res.status(201).json({ 
      message: 'Bulk tasks created successfully',
      tasksCount: tasksWithIds.length,
      tasks: tasksWithIds
    });
  } catch (error) {
    logger.error('Error in bulk tasks:', error);
    res.status(500).json({ error: 'Failed to create bulk tasks: ' + error.message });
  }
});

// Employee Management Routes
app.get('/api/employees', checkPermission('employees', 'read'), (req, res) => {
  try {
    const employees = readJsonFile(employeesFile);
    // Filter out duplicates before sending
    const uniqueEmployees = employees.filter((emp, index, self) =>
      index === self.findIndex(e => e.id === emp.id)
    );
    res.status(200).json(uniqueEmployees);
  } catch (error) {
    logger.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Employee-Department Routes
app.get('/api/employee-departments', checkPermission('employees', 'read'), (req, res) => {
  logger.info('=== GET /api/employee-departments called ===');
  try {
    const currentEmployeeDepartments = readJsonFile(employeeDepartmentsFile);
    logger.info('Current employee-departments:', currentEmployeeDepartments);
    res.status(200).json(currentEmployeeDepartments || []);
  } catch (error) {
    logger.error('Error fetching employee-departments:', error);
    res.status(500).json({ error: 'Failed to fetch employee-departments' });
  }
});

// Employee Department Management Routes
app.put('/api/employee-departments', (req, res) => {
  try {
    logger.info('=== PUT /api/employee-departments called ===');
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
    logger.error('Error updating employee departments:', error);
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
    logger.error('Error deleting data:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

// Authentication Routes
const authRouter = express.Router();

// Debug middleware for auth routes
authRouter.use((req, res, next) => {
  logger.debug('Auth route accessed:', req.path);
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
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    logger.info('Google OAuth callback:', {
      user: req.user,
      isAuthenticated: req.isAuthenticated(),
    });
    
    // Explicitly set session data
    if (req.user) {
      const userEmail = req.user?.emails?.[0]?.value || req.user?.email;
      const employeeId = await getEmployeeIdByEmail(userEmail);
      const userRole = await getUserRole(employeeId, userEmail);

      // Store additional user info in session
      req.session.user = {
        id: employeeId,
        email: userEmail,
        role: userRole
      };

      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          logger.error('Session save error:', err);
        }
        
        // Redirect to tasks page with success message
        res.redirect('http://localhost:3000/tasks');
      });
    } else {
      // Redirect to login page if no user found
      res.redirect('http://localhost:3000/login');
    }
  }
);

authRouter.get('/status', (req, res) => {
  logger.info('Auth Status Request:', {
    isAuthenticated: req.isAuthenticated(),
    user: req.user,
    sessionUser: req.session.user,
    session: req.session
  });

  if (req.isAuthenticated() && req.session.user) {
    res.json({
      authenticated: true,
      user: req.session.user,
      role: req.session.user.role
    });
  } else {
    logger.info('Not Authenticated');
    res.json({
      authenticated: false,
      user: null,
      role: null
    });
  }
});

// Logout handler function
function handleLogout(req, res) {
  logger.info('Logout request received');
  try {
    req.logout((err) => {
      if (err) {
        logger.error('Error during logout:', err);
        return res.status(500).json({ error: 'Failed to logout' });
      }

      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            logger.error('Error destroying session:', err);
            return res.status(500).json({ error: 'Failed to destroy session' });
          }
          res.clearCookie('connect.sid', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          });
          logger.info('Logout successful');
          res.json({ message: 'Logged out successfully' });
        });
      } else {
        logger.info('No session to destroy');
        res.json({ message: 'Logged out successfully' });
      }
    });
  } catch (error) {
    logger.error('Error in logout route:', error);
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
    logger.info('=== SEND NOTIFICATIONS ROUTE HANDLER CALLED ===');
    const { notifications } = req.body;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!notifications || !Array.isArray(notifications)) {
      logger.error('Invalid notifications data:', req.body);
      return res.status(400).json({ 
        error: 'Invalid notifications data. Expected an array of notifications.',
        receivedBody: req.body
      });
    }

    // Ensure OAuth credentials are set
    if (!oauth2Client.credentials.access_token) {
      logger.error('No access token available');
      return res.status(401).json({ error: 'No valid OAuth credentials' });
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const results = [];

    // Refresh token if needed
    try {
      await oauth2Client.refreshAccessToken();
    } catch (refreshError) {
      logger.error('Token refresh error:', refreshError);
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
        logger.error(`Failed to send notification to ${notification.email}:`, error);
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
    logger.error('Error in notifications endpoint:', error);
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
    logger.error('Bulk task error:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
});

// RBAC Management Routes
app.get('/api/roles', checkPermission('roles', 'write'), async (req, res) => {
  try {
    const userEmail = req.user.emails?.[0]?.value || req.user.email;
    const currentUserRole = await getUserRole(await getEmployeeIdByEmail(userEmail), userEmail);

    console.log('GET /api/roles - User Details:', { 
      userEmail, 
      currentUserRole 
    });

    // Only admins can view all roles
    if (currentUserRole !== ROLES.ADMIN) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all users with their roles
    const query = `
      SELECT 
        id as "employeeId",
        email,
        role,
        name
      FROM users
      ORDER BY email
    `;
    
    const result = await pool.query(query);
    
    console.log('GET /api/roles - Found Roles:', {
      count: result.rows.length,
      roles: result.rows
    });

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

app.put('/api/roles', checkPermission('roles', 'write'), async (req, res) => {
  try {
    const { employeeId, role, email } = req.body;
    console.log('PUT /api/roles - Request Details:', { 
      employeeId, 
      role,
      email,
      requestingUser: req.user.emails?.[0]?.value || req.user.email
    });

    const userEmail = req.user.emails?.[0]?.value || req.user.email;
    const currentUserRole = await getUserRole(await getEmployeeIdByEmail(userEmail), userEmail);

    console.log('PUT /api/roles - User Role Check:', {
      userEmail,
      currentUserRole
    });

    // Only admins can modify roles
    if (currentUserRole !== ROLES.ADMIN) {
      console.log('PUT /api/roles - Access Denied:', {
        reason: 'Not an admin',
        userRole: currentUserRole
      });
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!employeeId || !role) {
      console.log('PUT /api/roles - Invalid Request:', { employeeId, role });
      return res.status(400).json({ error: 'Employee ID and role are required' });
    }

    // Prevent role change for specific email
    if (email === 'belyakovvladimirs@gmail.com') {
      console.log('PUT /api/roles - Cannot Change Role:', email);
      return res.status(403).json({ error: 'Cannot change role for this user' });
    }

    // First try to find user by email
    let userLookupResult = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );

    // If not found by email, try by ID
    if (userLookupResult.rows.length === 0) {
      // Extract numeric part from employeeId if it's an old-style ID
      const numericPart = employeeId.replace(/[^0-9]/g, '');
      const uuid = crypto.createHash('md5').update(numericPart).digest('hex');
      
      userLookupResult = await pool.query(
        'SELECT id, email, role FROM users WHERE id::text = $1',
        [uuid]
      );
    }

    // If still not found, try by email part
    if (userLookupResult.rows.length === 0 && email) {
      userLookupResult = await pool.query(
        'SELECT id, email, role FROM users WHERE email = $1',
        [email]
      );
    }

    // If no user found, return detailed error
    if (userLookupResult.rows.length === 0) {
      console.log('PUT /api/roles - User Not Found:', { 
        searchedId: employeeId,
        searchedEmail: email
      });
      return res.status(404).json({ 
        error: 'Failed to update role', 
        details: 'User not found in database',
        searchedId: employeeId
      });
    }

    // Get the first matching user
    const userToUpdate = userLookupResult.rows[0];

    // Update role in database
    const updateQuery = 'UPDATE users SET role = $1 WHERE id = $2 RETURNING *';
    const updateResult = await pool.query(updateQuery, [role, userToUpdate.id]);

    console.log('PUT /api/roles - Role Updated Successfully:', { 
      employeeId: userToUpdate.id, 
      email: userToUpdate.email,
      oldRole: userToUpdate.role,
      newRole: role 
    });

    res.json({ 
      message: 'Role updated successfully', 
      userRole: { 
        employeeId: userToUpdate.id, 
        email: userToUpdate.email,
        role 
      } 
    });
  } catch (error) {
    console.error('Error updating role:', error);
    
    // More detailed error response
    res.status(500).json({ 
      error: 'Failed to update role', 
      details: error.message 
    });
  }
});

// Goals Management Routes
app.get('/api/goals', checkPermission('goals', 'read'), (req, res) => {
  try {
    const goals = readJsonFile(goalsFile);
    // Ensure we always return an array
    res.status(200).json(Array.isArray(goals) ? goals : [goals]);
  } catch (error) {
    logger.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

app.post('/api/goals', checkPermission('goals', 'write'), (req, res) => {
  try {
    const newGoal = {
      ...req.body,
      id: req.body.id || `goal-${Date.now()}`,
      createdAt: req.body.createdAt || new Date().toISOString(),
      status: req.body.status || 'pending'
    };

    const goals = readJsonFile(goalsFile);
    const updatedGoals = Array.isArray(goals) ? [...goals, newGoal] : [newGoal];
    
    writeJsonFile(goalsFile, updatedGoals);
    res.status(201).json(newGoal);
  } catch (error) {
    logger.error('Error saving goal:', error);
    res.status(500).json({ error: 'Failed to save goal' });
  }
});

// Department Current Values endpoint
app.get('/api/department-values', checkPermission('goals', 'read'), (req, res) => {
  try {
    const departmentValues = readJsonFile(path.join(storageDir, 'department-values.json'));
    res.status(200).json(departmentValues || {});
  } catch (error) {
    logger.error('Error fetching department values:', error);
    res.status(500).json({ error: 'Failed to fetch department values' });
  }
});

app.put('/api/department-values', checkPermission('goals', 'write'), (req, res) => {
  try {
    const values = req.body;
    writeJsonFile(path.join(storageDir, 'department-values.json'), values);
    res.status(200).json({ message: 'Department values updated successfully' });
  } catch (error) {
    logger.error('Error updating department values:', error);
    res.status(500).json({ error: 'Failed to update department values' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: req.user?.email
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// Error handling for undefined routes
app.use((req, res) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    user: req.user?.email
  });
  
  const availableRoutes = [
    '/api/tasks',
    '/api/tasks/:taskId',
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

// Start server with database connection check
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    logger.info('Connected to PostgreSQL database');

    // Start the server
    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  }
};

startServer(); 