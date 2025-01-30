const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'budget_tracker',
  password: '1111', // Hardcoded password for testing
  port: process.env.POSTGRES_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait before timing out when connecting a new client
  
  // Detailed connection logging
  application_name: 'BudgetTrackerApp',
  keepAlive: true,
});

// Enhanced connection and error logging
console.log('PostgreSQL Connection Configuration:', {
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'budget_tracker',
  port: process.env.POSTGRES_PORT || 5432,
});

// Comprehensive connection error handling
pool.on('error', (err, client) => {
  console.error('Unexpected PostgreSQL client error', {
    message: err.message,
    name: err.name,
    code: err.code,
    detail: err.detail,
    hint: err.hint,
    stack: err.stack
  });
});

// Test connection method
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL');
    client.release();
  } catch (error) {
    console.error('Connection Test Failed:', {
      message: error.message,
      name: error.name,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
  }
};

// Run connection test
testConnection();

// Add more comprehensive logging
console.log('Attempting to connect to PostgreSQL with:', {
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'budget_tracker',
  port: process.env.POSTGRES_PORT || 5432,
});

// Add event listeners for the pool
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

// Verify connection parameters
console.log('Database Connection Parameters:', {
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  port: process.env.POSTGRES_PORT,
  passwordLength: '1111'.length
});

// Helper function to run queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error executing query', { text, error });
    throw error;
  }
};

// Helper function to get a client from the pool
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = () => {
    client.release();
  };
  return { client, query, release };
};

module.exports = {
  pool,
  query,
  getClient
}; 