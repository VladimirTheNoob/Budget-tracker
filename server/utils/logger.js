const winston = require('winston');
const { format } = winston;
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to Winston
winston.addColors(colors);

// Define the format for logging
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  format.colorize({ all: true }),
  format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define file locations
const logDir = 'logs';
const errorLog = path.join(logDir, 'error.log');
const combinedLog = path.join(logDir, 'combined.log');

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    format.json(),
  ),
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: errorLog,
      level: 'error',
      format: format.combine(
        format.timestamp(),
        format.json(),
      ),
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: combinedLog,
      format: format.combine(
        format.timestamp(),
        format.json(),
      ),
    }),
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'rejections.log') }),
  ],
});

// If we're not in production, log to the console with colors
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: logFormat,
  }));
}

// Create a stream object for Morgan
const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Export logger and stream
module.exports = {
  logger,
  stream,
}; 