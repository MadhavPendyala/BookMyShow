// backend/src/db.js
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bookmyshow',
  password: process.env.DB_PASSWORD || 'secretpassword',
  port: process.env.DB_PORT || 5432,
  max: 20, // Max concurrent database connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = pool;