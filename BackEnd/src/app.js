// backend/src/app.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { WebSocketServer } = require('ws');
const { holdSeats, checkout } = require('./controllers/bookingController');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rest API Endpoints
app.post('/api/v1/shows/:showId/hold-seats', holdSeats);
app.post('/api/v1/bookings/checkout', checkout);

// WebSocket Setup
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  console.log('[WS] Client connected to live stream');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      // Broadcast seat state updates to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // 1 = OPEN
          client.send(JSON.stringify(data));
        }
      });
    } catch (e) {
      console.error('[WS] Parse error:', e);
    }
  });

  ws.on('close', () => console.log('[WS] Client disconnected'));
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 BookMyShow Engine running on http://localhost:${PORT}`);
});