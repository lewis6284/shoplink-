const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const routes = require('./routes');

const app = express();

app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middlewares
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
// Mount API on both /api and /shoplink/api for compatibility
app.use(['/shoplink/api', '/api'], routes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root Redirect
app.get('/', (req, res) => {
  res.redirect('/shoplink/');
});

// Serve Frontend Static Files
const frontendPath = path.resolve(__dirname, 'public');
// This will serve /shoplink/assets/... from public/shoplink/assets/...
app.use(express.static(frontendPath));

// Frontend Catch-all Fallback (Single Page Application)
app.use((req, res, next) => {
  // If it's an API request that wasn't found, let it pass to error handler
  if (req.url.startsWith('/api') || req.url.startsWith('/shoplink/api') || req.url === '/health') {
    return next();
  }

  // Serve the index.html from the shoplink subfolder for all frontend routes
  res.sendFile(path.join(frontendPath, 'shoplink', 'index.html'));
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;
