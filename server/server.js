/**
 * server.js — PolicyPilot API Server
 *
 * Entry point for the Express backend.
 * Connects to MongoDB, mounts all routes, and starts the HTTP server.
 */
require('dotenv').config();
require('express-async-errors'); // Automatically wraps async handlers to catch errors

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// ── Initial MongoDB connection attempt (non-blocking) ────────────────────────
connectDB().catch((err) => console.warn('Initial DB connection in background:', err.message));

// Helper to unwrap router/middleware whether imported via CommonJS, ESM, or bundled by Vercel
const resolveMiddleware = (mod) => {
  if (typeof mod === 'function') return mod;
  if (mod && typeof mod.default === 'function') return mod.default;
  if (mod && mod.router && typeof mod.router === 'function') return mod.router;
  if (mod && mod.default && typeof mod.default.router === 'function') return mod.default.router;
  return mod;
};

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or serverless rewrites)
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        process.env.CLIENT_URL,
      ].filter(Boolean);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'PolicyPilot API is running',
    timestamp: new Date().toISOString(),
  });
});

// ── Ensure DB Connection for Requests ─────────────────────────────────────────
app.use(async (req, res, next) => {
  if (req.path === '/api/health') return next();
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', resolveMiddleware(authRoutes));
app.use('/api/documents', resolveMiddleware(documentRoutes));
app.use('/api/chat', resolveMiddleware(chatRoutes));

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(resolveMiddleware(errorHandler));

// ── Start / Export Server ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 PolicyPilot server running on http://localhost:${PORT}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV}`);
  });
}

app.default = app;
module.exports = app;
module.exports.default = app;
