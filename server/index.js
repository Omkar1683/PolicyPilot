/**
 * server/index.js
 * Default entry point pointing to server.js
 */
const server = require('./server');
const app = (server && server.default) || server;
module.exports = app;
module.exports.default = app;
