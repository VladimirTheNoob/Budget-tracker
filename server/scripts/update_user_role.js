const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'budget_tracker',
  password: process.env.POSTGRES_PASSWORD || '1111',
  port: process.env.POSTGRES_PORT || 5432,
});

async function updateUserRole(email, newRole) {
  try {
    const query = 'UPDATE users SET role = $1 WHERE email = $2 RETURNING *';
    const result = await pool.query(query, [newRole, email]);
    
    console.log('User role updated:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating user role:', error);
  } finally {
    await pool.end();
  }
}

// Replace with your email
const userEmail = 'belyakovvladimirs@gmail.com';
const newRole = 'admin';

updateUserRole(userEmail, newRole); 