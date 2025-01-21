const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config();

const app = express();  

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000']
}));

// Middleware
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.send('Welcome to the Company Goal Tracker API');
});

// Mock routes for testing
app.get('/employees', (req, res) => {
  res.json([
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' }
  ]);
});

app.post('/tasks', (req, res) => {
  console.log('Received task:', req.body);
  res.status(201).json({ message: 'Task created successfully', task: req.body });
});

const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 