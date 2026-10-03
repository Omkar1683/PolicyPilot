/**
 * api/index.js — Vercel Serverless Function entry point
 * Bridges Vercel serverless requests to the Express app.
 */
const server = require('../server/server');
const app = (server && server.default) || server;

module.exports = app;
module.exports.default = app;
