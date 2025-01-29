const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const passport = require('passport');

const app = express();

// Add all your existing routes and middleware from server/index.js
app.use(express.json());
app.use(cors());
app.use(passport.initialize());

// Copy all routes from your original server/index.js
app.get('/api/tasks', (req, res) => { /*...*/ });
// ... other routes

// Wrap Express app with serverless-http
const handler = serverless(app);

module.exports.handler = async (event, context) => {
  return await handler(event, context);
}; 