const app = require('./index');
const { testDatabaseConnection } = require('./config/database');
const http = require('http');
const os = require('os');
const { logger } = require('./utils/logger');
const { pool } = require('./config/database');

const port = process.env.PORT || 5000;

// Validate database connection before starting server
const validateDatabaseConnection = async () => {
  try {
    console.log('Starting database connection validation...');
    console.log('Attempting to test database connection...');
    const connectionResult = await testDatabaseConnection();
    console.log('Database connection test result:', connectionResult);
    if (!connectionResult) {
      console.error('Database connection test failed');
      throw new Error('Database connection test failed');
    }
    logger.info('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('Database Connection Failed:', {
      errorName: error.name,
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack
    });
    logger.error('❌ Database Connection Failed', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    });
    throw error;
  }
};

// Enhanced server startup function
const startServer = async () => {
  try {
    // Validate database connection first
    await validateDatabaseConnection();

    // Start the server
    const server = app.listen(port, () => {
      logger.info(`🚀 Server running on port ${port}`);
      logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📦 Server Details:`, {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch()
      });
    });

    // Handle server startup errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${port} is already in use. Possible solutions:
          1. Kill the process using the port
          2. Use a different port by setting PORT environment variable
          3. Check if another server is already running`);
      } else {
        logger.error('❌ Server Startup Error', {
          errorName: error.name,
          errorMessage: error.message,
          errorCode: error.code,
          errorStack: error.stack
        });
      }
      process.exit(1);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      logger.info('🛑 SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        logger.info('💤 Server closed');
        pool.end(() => {
          logger.info('🔌 Database pool closed');
          process.exit(0);
        });
      });
    });

  } catch (error) {
    logger.error('❌ Server Startup Failed', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    });
    process.exit(1);
  }
};

// Start the server
startServer(); 