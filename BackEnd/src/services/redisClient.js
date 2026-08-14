// backend/src/redisClient.js
const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
});

// Read Lua file
const luaScriptPath = path.join(__dirname, 'redis', 'lock_seats.lua');
const lockSeatsLua = fs.readFileSync(luaScriptPath, 'utf8');

// Define custom command in ioredis
redis.defineCommand('atomicLockSeats', {
  numberOfKeys: 0, // Dynamic number of keys passed during execution
  lua: lockSeatsLua,
});

module.exports = redis;