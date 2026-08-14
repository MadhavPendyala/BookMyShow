const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Redis client setup
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379
});

const HOLD_TTL_SECONDS = 480; // 8 minutes seat hold window

io.on('connection', (socket) => {
  console.log(`⚡ Connected: ${socket.id}`);

  // 1. Join Showtime Room & Fetch Current Held/Booked Seats
  socket.on('JOIN_SHOWTIME', async ({ showtimeId }) => {
    socket.join(showtimeId);
    socket.showtimeId = showtimeId;

    try {
      const keys = await redis.keys(`showtime:${showtimeId}:seat:*`);
      const seatStates = {};

      if (keys.length > 0) {
        const pipeline = redis.pipeline();
        keys.forEach((key) => pipeline.get(key));
        const results = await pipeline.exec();

        keys.forEach((key, index) => {
          const seatId = key.split(':seat:')[1];
          const val = results[index][1];
          if (val) {
            seatStates[seatId] = JSON.parse(val);
          }
        });
      }

      socket.emit('INITIAL_SEAT_STATES', seatStates);
    } catch (err) {
      console.error('Error fetching initial seats:', err);
    }
  });

  // 2. Lock Seat Event (Atomic Redis Lock)
  socket.on('LOCK_SEAT', async ({ showtimeId, seatId }) => {
    const redisKey = `showtime:${showtimeId}:seat:${seatId}`;
    const payload = JSON.stringify({
      status: 'HELD',
      lockedBy: socket.id,
      timestamp: Date.now()
    });

    try {
      // SET key value NX EX ttl
      // NX = Only set key if it DOES NOT exist (Atomic check)
      // EX = Auto-expire after TTL (Prevents abandoned locked seats)
      const acquired = await redis.set(redisKey, payload, 'NX', 'EX', HOLD_TTL_SECONDS);

      if (acquired === 'OK') {
        // Lock succeeded -> Broadcast to everyone in this showtime room
        io.to(showtimeId).emit('SEAT_LOCKED', {
          seatId,
          lockedBy: socket.id,
          ttl: HOLD_TTL_SECONDS
        });
      } else {
        // Race condition lost! Another user tapped it first
        socket.emit('LOCK_FAILED', {
          seatId,
          message: 'Seat was just claimed by another user!'
        });
      }
    } catch (err) {
      console.error('Redis Lock Error:', err);
    }
  });

  // 3. Unlock Seat Event
  socket.on('UNLOCK_SEAT', async ({ showtimeId, seatId }) => {
    const redisKey = `showtime:${showtimeId}:seat:${seatId}`;

    try {
      const rawVal = await redis.get(redisKey);
      if (rawVal) {
        const val = JSON.parse(rawVal);
        if (val.lockedBy === socket.id) {
          await redis.del(redisKey);
          io.to(showtimeId).emit('SEAT_UNLOCKED', { seatId });
        }
      }
    } catch (err) {
      console.error('Redis Unlock Error:', err);
    }
  });

  // 4. Auto-release locks on disconnect
  socket.on('disconnect', async () => {
    console.log(`❌ Disconnected: ${socket.id}`);
    if (!socket.showtimeId) return;

    try {
      const keys = await redis.keys(`showtime:${socket.showtimeId}:seat:*`);
      for (const key of keys) {
        const rawVal = await redis.get(key);
        if (rawVal) {
          const val = JSON.parse(rawVal);
          if (val.lockedBy === socket.id && val.status === 'HELD') {
            await redis.del(key);
            const seatId = key.split(':seat:')[1];
            io.to(socket.showtimeId).emit('SEAT_UNLOCKED', { seatId });
          }
        }
      }
    } catch (err) {
      console.error('Disconnect Cleanup Error:', err);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Socket Server on port ${PORT}`));