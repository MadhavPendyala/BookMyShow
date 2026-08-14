/**
 * WebSocket Manager for Live Seat Synchronization
 * Broadcasts seat state changes (HELD, AVAILABLE, BOOKED) to all connected clients in real time.
 */

const { WebSocketServer } = require('ws');

let wss = null;

/**
 * Initialize the WebSocket Server on the existing HTTP server instance
 */
function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[WS] New client connected from ${clientIp}`);

    // Send initial handshake acknowledgement
    ws.send(JSON.stringify({
      type: 'CONNECTED',
      message: 'Successfully connected to live seat update stream.'
    }));

    // Handle incoming client messages (e.g., show room subscription)
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        // Example: Client subscribing to a specific show layout
        if (data.type === 'SUBSCRIBE_SHOW') {
          ws.showId = data.showId;
          console.log(`[WS] Client subscribed to show: ${data.showId}`);
        }
      } catch (err) {
        console.error('[WS] Failed to parse message:', err.message);
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
    });

    ws.on('error', (err) => {
      console.error('[WS] Error:', err.message);
    });
  });

  return wss;
}

/**
 * Broadcast seat changes to clients viewing a specific show
 * @param {string} showId - The show identifier
 * @param {Array<string>} seatIds - Array of seat IDs updated
 * @param {string} status - New state: 'HELD' | 'AVAILABLE' | 'BOOKED'
 * @param {string} [userId] - Optional ID of the user performing the action
 */
function broadcastSeatUpdate(showId, seatIds, status, userId = null) {
  if (!wss) {
    console.warn('[WS] WebSocket server not initialized.');
    return;
  }

  const payload = JSON.stringify({
    type: 'SEAT_STATUS_UPDATE',
    showId,
    seatIds,
    status,
    userId,
    timestamp: new Date().toISOString()
  });

  let recipientCount = 0;

  wss.clients.forEach((client) => {
    // Only broadcast to active clients viewing the same show
    if (client.readyState === 1 && (!client.showId || client.showId === showId)) {
      client.send(payload);
      recipientCount++;
    }
  });

  console.log(`[WS] Broadcasted status '${status}' for seats [${seatIds.join(', ')}] to ${recipientCount} client(s).`);
}

module.exports = {
  initWebSocket,
  broadcastSeatUpdate
};