const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const crypto = require('crypto');
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

// Read employees JSON file
const readEmployeesFile = () => {
  try {
    const filePath = path.join(__dirname, '../storage/employees.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading employees file:', error);
    return [];
  }
};

// Read user roles JSON file
const readUserRolesFile = () => {
  try {
    const filePath = path.join(__dirname, '../storage/user-roles.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading user-roles file:', error);
    return [];
  }
};

// One-time import of users
const importUsersToDatabase = async () => {
  const client = await pool.connect();

  try {
    // Start a transaction
    await client.query('BEGIN');

    // Read employees and user roles
    const employees = readEmployeesFile();
    const userRoles = readUserRolesFile();

    console.log(`Importing ${employees.length} users...`);

    // Prepare the insert query for users
    const insertUserQuery = `
      INSERT INTO users (
        id, 
        name, 
        email, 
        role
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE 
      SET 
        name = EXCLUDED.name, 
        email = EXCLUDED.email, 
        role = EXCLUDED.role
    `;

    // Prepare the insert query for departments with upsert
    const insertDepartmentQuery = `
      INSERT INTO departments (
        id, 
        name
      ) VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE 
      SET name = EXCLUDED.name
      RETURNING id
    `;

    // Prepare the insert query for employee_departments
    const insertEmployeeDepartmentQuery = `
      INSERT INTO employee_departments (
        id, 
        user_id, 
        department_id
      ) VALUES ($1, $2, $3)
      ON CONFLICT (id) DO NOTHING
    `;

    // Track imported users
    const importedUsers = [];

    // Import each employee
    for (const employee of employees) {
      try {
        // Find role for this employee (default to 'employee')
        const userRole = userRoles.find(ur => ur.employeeId === employee.id)?.role || 'employee';

        // Generate a consistent UUID based on the employee's original ID
        const userId = uuidv4();
        const departmentId = uuidv4();
        const employeeDepartmentId = uuidv4();

        // Insert or update department
        const departmentResult = await client.query(insertDepartmentQuery, [
          departmentId,
          employee.department
        ]);
        const actualDepartmentId = departmentResult.rows[0].id;

        // Insert user
        await client.query(insertUserQuery, [
          userId,
          employee.name,
          employee.email,
          userRole
        ]);

        // Insert employee-department relationship
        await client.query(insertEmployeeDepartmentQuery, [
          employeeDepartmentId,
          userId,
          actualDepartmentId
        ]);

        importedUsers.push({
          id: userId,
          name: employee.name,
          email: employee.email,
          department: employee.department,
          role: userRole
        });
      } catch (insertError) {
        console.error(`Error importing user ${employee.name}:`, insertError);
        // Continue with next user instead of stopping entire import
        continue;
      }
    }

    // Commit the transaction
    await client.query('COMMIT');

    console.log('User import completed successfully.');
    console.log('Imported Users:', importedUsers);

    return importedUsers;
  } catch (error) {
    // Rollback the transaction in case of any error
    await client.query('ROLLBACK');
    console.error('User import failed:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
};

// Verify imported users
const verifyImportedUsers = async () => {
  const client = await pool.connect();

  try {
    const usersResult = await client.query('SELECT * FROM users');
    const departmentsResult = await client.query('SELECT * FROM departments');
    const employeeDepartmentsResult = await client.query('SELECT * FROM employee_departments');

    console.log('Total users imported:', usersResult.rows.length);
    console.log('Total departments imported:', departmentsResult.rows.length);
    console.log('Total employee-department relationships:', employeeDepartmentsResult.rows.length);

    console.log('Imported Users Details:');
    for (const user of usersResult.rows) {
      // Find department for this user
      const employeeDepartment = employeeDepartmentsResult.rows.find(ed => ed.user_id === user.id);
      const department = employeeDepartment 
        ? departmentsResult.rows.find(d => d.id === employeeDepartment.department_id)
        : null;

      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}, Department: ${department?.name || 'N/A'}`);
    }
  } catch (error) {
    console.error('Error verifying imported users:', error);
  } finally {
    client.release();
  }
};

// Run the import and verification
const runImport = async () => {
  try {
    await importUsersToDatabase();
    await verifyImportedUsers();
    process.exit(0);
  } catch (error) {
    console.error('Import process failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Execute the import if script is run directly
if (require.main === module) {
  runImport();
}

module.exports = { importUsersToDatabase, verifyImportedUsers }; 