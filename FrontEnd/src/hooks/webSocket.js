// backend/src/websockets/seatUpdates.js
const { WebSocketServer } = require('ws');

function setupWebSocketServer(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Map to group client connections by showId
  const showRooms = new Map();

  wss.on('connection', (ws, req) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const showId = urlParams.get('showId');

    if (!showId) {
      ws.close(1008, 'showId parameter required');
      return;
    }

    // Add socket to show room
    if (!showRooms.has(showId)) {
      showRooms.set(showId, new Set());
    }
    showRooms.get(showId).add(ws);

    console.log(`[WS] Client joined show room: ${showId}`);

    ws.on('close', () => {
      if (showRooms.has(showId)) {
        showRooms.get(showId).delete(ws);
      }
    });
  });

  // Function to broadcast seat state updates to all clients watching the show
  function broadcastSeatUpdate(showId, seatIds, newStatus) {
    if (!showRooms.has(showId)) return;

    const payload = JSON.stringify({
      type: 'SEAT_UPDATE',
      seatIds,
      status: newStatus, // 'HELD', 'AVAILABLE', 'BOOKED'
      timestamp: Date.now()
    });

    for (const client of showRooms.get(showId)) {
      if (client.readyState === 1) { // 1 = WebSocket.OPEN
        client.send(payload);
      }
    }
  }

  return { broadcastSeatUpdate };
}

module.exports = { setupWebSocketServer };