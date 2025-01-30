const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'budget_tracker',
  password: process.env.POSTGRES_PASSWORD || '1111',
  port: process.env.POSTGRES_PORT || 5432,
});

// Helper function to read JSON file
const readJsonFile = (filename) => {
  const filePath = path.join(__dirname, '../storage', filename);
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
};

// Migrate Users
const migrateUsers = async (client) => {
  console.log('Migrating Users...');
  const employees = JSON.parse(fs.readFileSync(path.join(__dirname, '../storage/employees.json'), 'utf8'));
  console.log('Employees to migrate:', employees.length);

  for (const emp of employees) {
    try {
      const userQuery = `
        INSERT INTO users (id, name, email, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING
      `;
      
      await client.query(userQuery, [
        emp.id,  // Use the existing ID format
        emp.name, 
        emp.email, 
        'employee'  // Default role
      ]);
    } catch (error) {
      console.error('Error inserting user:', emp, error);
    }
  }
};

// Migrate Departments
const migrateDepartments = async (client) => {
  console.log('Migrating Departments...');
  const departments = JSON.parse(fs.readFileSync(path.join(__dirname, '../storage/departments.json'), 'utf8'));
  console.log('Departments to migrate:', departments.length);

  for (const dept of departments) {
    try {
      const deptQuery = `
        INSERT INTO departments (id, name)
        VALUES ($1, $2)
        ON CONFLICT (id) DO NOTHING
      `;
      
      await client.query(deptQuery, [
        dept.id,  // Use the existing ID format
        dept.name
      ]);
    } catch (error) {
      console.error('Error inserting department:', dept, error);
    }
  }
};

// Migrate Employee Departments
const migrateEmployeeDepartments = async (client, usersMap, departmentsMap) => {
  console.log('Migrating Employee Departments...');
  const employees = JSON.parse(fs.readFileSync(path.join(__dirname, '../storage/employees.json'), 'utf8'));
  console.log('Employee Departments to migrate:', employees.length);

  for (const emp of employees) {
    try {
      // Skip if no department
      if (!emp.department) continue;

      const empDeptQuery = `
        INSERT INTO employee_departments (id, user_id, department_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO NOTHING
      `;
      
      // Generate a unique ID for the employee-department relationship
      const empDeptId = `empDept-${emp.id}-${emp.department}`;

      await client.query(empDeptQuery, [
        empDeptId,
        emp.id,
        departmentsMap[emp.department]
      ]);
    } catch (error) {
      console.error('Error inserting employee department:', emp, error);
    }
  }
};

// Migrate Tasks
const migrateTasks = async (client, usersMap, departmentsMap) => {
  console.log('Migrating Tasks...');
  const tasks = JSON.parse(fs.readFileSync(path.join(__dirname, '../storage/tasks.json'), 'utf8'));
  console.log('Tasks to migrate:', tasks.length);

  for (const task of tasks) {
    try {
      // Prioritize non-empty values for email and employee
      const taskEmail = task.email || task.employee;
      const taskDepartment = task.department;

      const taskQuery = `
        INSERT INTO tasks (id, name, status, due_date, assigned_to, department_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `;
      
      await client.query(taskQuery, [
        task.id,  // Use the existing ID format
        task.name, 
        task.status || 'pending',
        task.date ? new Date(task.date) : null,
        taskEmail ? usersMap[taskEmail] : null,
        taskDepartment ? departmentsMap[taskDepartment] : null,
        task.createdAt ? new Date(task.createdAt) : new Date()
      ]);
    } catch (error) {
      console.error('Error inserting task:', task, error);
    }
  }
};

// Migrate Goals
const migrateGoals = async (client) => {
  const goals = readJsonFile('goals.json');
  
  console.log('Goals to migrate:', goals ? 1 : 0);
  
  try {
    // Clear existing goals
    await client.query('DELETE FROM goals');

    // First, get department IDs
    const departmentsResult = await client.query('SELECT id, name FROM departments');
    const departmentsMap = departmentsResult.rows.reduce((acc, dept) => {
      acc[dept.name] = dept.id;
      return acc;
    }, {});

    const usersResult = await client.query('SELECT id, email FROM users');
    const usersMap = usersResult.rows.reduce((acc, user) => {
      acc[user.email] = user.id;
      return acc;
    }, {});

    // Goals JSON seems to be a single object, not an array
    const goal = goals;
    
    if (!goal) {
      console.warn('No goal found in goals.json');
      return;
    }

    try {
      const query = `
        INSERT INTO goals (
          id, title, description, 
          department_id, target_value, current_value, 
          start_date, end_date, status, created_by
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      const values = [
        uuidv4(),
        goal.title,
        goal.description || '',
        null, // No department specified in JSON
        parseFloat(goal.targetAmount) || 0,
        0, // current_value starts at 0
        goal.targetDate ? new Date(goal.targetDate) : new Date(),
        goal.targetDate ? new Date(goal.targetDate) : null,
        goal.status || 'pending',
        null // No creator specified
      ];
      await client.query(query, values);
    } catch (insertError) {
      console.error('Error inserting goal:', goal, insertError);
    }

    console.log('Goals migrated successfully');
  } catch (error) {
    console.error('Error migrating goals:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
  }
};

// Main migration function
const migrateDatabaseFromJson = async () => {
  console.log('Database Connection Details:');
  console.log('User:', process.env.POSTGRES_USER);
  console.log('Host:', process.env.POSTGRES_HOST);
  console.log('Port:', process.env.POSTGRES_PORT);
  console.log('Database:', process.env.POSTGRES_DB);

  const pool = new Pool({
    user: process.env.POSTGRES_USER,
    password: String(process.env.POSTGRES_PASSWORD), // Explicitly convert to string
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Attempting to connect to the database...');
    const client = await pool.connect();
    console.log('Database connection successful!');
    
    console.log('Starting database migration...');
    
    console.log('Migrating Users...');
    await migrateUsers(client);
    
    console.log('Migrating Departments...');
    await migrateDepartments(client);
    
    // Get users and departments maps for subsequent migrations
    const usersResult = await client.query('SELECT id, email FROM users');
    const usersMap = usersResult.rows.reduce((acc, user) => {
      acc[user.email] = user.id;
      return acc;
    }, {});

    const departmentsResult = await client.query('SELECT id, name FROM departments');
    const departmentsMap = departmentsResult.rows.reduce((acc, dept) => {
      acc[dept.name] = dept.id;
      return acc;
    }, {});

    console.log('Migrating Employee Departments...');
    await migrateEmployeeDepartments(client, usersMap, departmentsMap);
    
    console.log('Migrating Tasks...');
    await migrateTasks(client, usersMap, departmentsMap);
    
    console.log('Migrating Goals...');
    await migrateGoals(client);
    
    console.log('Full database migration completed successfully');
    
    client.release();
  } catch (error) {
    console.error('Error during database migration:');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    
    // Additional logging for connection-specific errors
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection Refused: Check if PostgreSQL is running and the connection details are correct.');
    } else if (error.message.includes('SASL')) {
      console.error('SASL Authentication Error: Verify your password and authentication method.');
    }
  } finally {
    await pool.end();
  }
};

// Verify migrated data
const verifyMigratedData = async () => {
  const client = await pool.connect();
  try {
    const tables = ['users', 'departments', 'employee_departments', 'tasks', 'goals'];
    
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table.toUpperCase()} count:`, result.rows[0].count);
      
      // If count is 0, log more details
      if (result.rows[0].count === '0') {
        console.error(`WARNING: No data migrated to ${table} table`);
        
        // Additional debugging for specific tables
        if (table === 'users') {
          const employees = readJsonFile('employees.json');
          console.log('Employees JSON:', employees);
        } else if (table === 'tasks') {
          const tasks = readJsonFile('tasks.json');
          console.log('Tasks JSON:', tasks);
        } else if (table === 'goals') {
          const goals = readJsonFile('goals.json');
          console.log('Goals JSON:', goals);
        }
      }
    }
  } catch (error) {
    console.error('Error verifying migrated data:', error);
  } finally {
    client.release();
  }
};

// Run migration
migrateDatabaseFromJson(); 