const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const path    = require('path');
const routes  = require('./routes');

const app = express();

// ─── Logging ────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── Core Middlewares ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ──────────────────────────────────────────────────────────────
// Accept both /shoplink/api (deployed) and /api (local dev proxy)
app.use(['/shoplink/api', '/api'], routes);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get(['/health', '/shoplink/health'], (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ─── Root Redirect — always send bare / to /shoplink/ ────────────────────────
app.get('/', (req, res) => res.redirect(301, '/shoplink/'));

// ─── Serve Uploaded Files ─────────────────────────────────────────────────────
// Multer saves to api/uploads/ (outside public) so upload files are not part of
// the public frontend assets tree. They are still served via /uploads and
// /shoplink/uploads paths, but the storage directory is separate.
const uploadsDir = path.resolve(__dirname, 'uploads');
app.use(['/shoplink/uploads', '/uploads'], express.static(uploadsDir));

// ─── Serve Frontend Static Assets under /shoplink/ ───────────────────────────
// Files live in public/shoplink/, Vite built them with base='/shoplink/'
// so asset URLs are already /shoplink/assets/... — this maps them correctly.
const frontendDist = path.resolve(__dirname, 'public', 'shoplink');
app.use('/shoplink', express.static(frontendDist));

// ─── SPA Fallback — only for /shoplink/* routes ───────────────────────────────
// Any /shoplink/... URL that is NOT a static file gets index.html so React
// Router can handle it client-side.
app.get('/shoplink/*splat', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// ─── Catch-All — anything outside /shoplink → redirect in ────────────────────
// This prevents stray URLs from landing on a blank Express page or
// accidentally serving something unintended.
app.use((req, res) => {
  // API 404 — return JSON for API calls
  if (req.url.startsWith('/api') || req.url.startsWith('/shoplink/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  // Everything else → redirect into the app (React 404 page handles the rest)
  res.redirect(301, '/shoplink/');
});

// ─── Centralized Error Handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status  = err.status  || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

module.exports = app;
