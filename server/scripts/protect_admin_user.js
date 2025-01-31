const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'budget_tracker',
  password: process.env.POSTGRES_PASSWORD || '1111',
  port: process.env.POSTGRES_PORT || 5432,
});

// Protect admin user
const protectAdminUser = async () => {
  const client = await pool.connect();

  try {
    // Start a transaction
    await client.query('BEGIN');

    // Find the user by email and update their role to admin
    const updateUserQuery = `
      UPDATE users 
      SET 
        role = 'admin', 
        is_protected = true 
      WHERE email = $1
      RETURNING id, name, email, role, is_protected
    `;

    const result = await client.query(updateUserQuery, ['belyakovvladimirs@gmail.com']);

    if (result.rows.length === 0) {
      console.error('User not found with email: belyakovvladimirs@gmail.com');
      await client.query('ROLLBACK');
      return;
    }

    const protectedUser = result.rows[0];
    console.log('Protected Admin User:', protectedUser);

    // Commit the transaction
    await client.query('COMMIT');
  } catch (error) {
    // Rollback the transaction in case of any error
    await client.query('ROLLBACK');
    console.error('Error protecting admin user:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
};

// Create trigger to prevent modifications to protected users
const createProtectedUserTrigger = async () => {
  const client = await pool.connect();

  try {
    // Add is_protected column if not exists
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_protected BOOLEAN DEFAULT false
    `);

    // Create trigger to prevent deletion of protected users
    await client.query(`
      CREATE OR REPLACE FUNCTION prevent_protected_user_deletion()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.is_protected = true THEN
          RAISE EXCEPTION 'Cannot delete protected user %', OLD.name;
        END IF;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS protect_admin_user_deletion ON users;
      CREATE TRIGGER protect_admin_user_deletion
      BEFORE DELETE ON users
      FOR EACH ROW
      EXECUTE FUNCTION prevent_protected_user_deletion();
    `);

    // Create trigger to prevent role changes for protected users
    await client.query(`
      CREATE OR REPLACE FUNCTION prevent_protected_user_role_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.is_protected = true AND OLD.role != NEW.role THEN
          RAISE EXCEPTION 'Cannot change role of protected user %', OLD.name;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS protect_admin_user_role ON users;
      CREATE TRIGGER protect_admin_user_role
      BEFORE UPDATE OF role ON users
      FOR EACH ROW
      EXECUTE FUNCTION prevent_protected_user_role_change();
    `);

    console.log('Protection triggers created successfully');
  } catch (error) {
    console.error('Error creating protection triggers:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run protection script
const runProtection = async () => {
  try {
    await createProtectedUserTrigger();
    await protectAdminUser();
    process.exit(0);
  } catch (error) {
    console.error('Admin user protection failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Execute the protection if script is run directly
if (require.main === module) {
  runProtection();
}

module.exports = { protectAdminUser, createProtectedUserTrigger }; 