/**
 * api/index.js — Vercel Serverless Function entry point
 * Bridges Vercel serverless requests to the Express app.
 */
const app = require('../server/server');

module.exports = app;
