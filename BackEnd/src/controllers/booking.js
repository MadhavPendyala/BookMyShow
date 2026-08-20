const redis = require('../redisClient');
const db = require('../db');

exports.holdSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const { seatIds, userId = "USER_MOCK_1" } = req.body;

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ message: "At least one seat must be provided." });
    }

    const holdTTLSeconds = 480; 
    const keys = seatIds.map(seatId => `lock:${showId}:${seatId}`);
    const result = await redis.eval(
      redis.scripts.atomicLockSeats ? redis.scripts.atomicLockSeats : undefined,
      keys.length,
      ...keys,
      holdTTLSeconds,
      userId
    );

    if (result[0] === 0) {
      const takenSeat = result[1].split(':').pop();
      return res.status(409).json({ 
        message: `Seat ${takenSeat} was just taken by another user!`,
        seatId: takenSeat 
      });
    }

    const expiresAt = new Date(Date.now() + holdTTLSeconds * 1000).toISOString();

    return res.status(200).json({
      message: "Seats held successfully!",
      seatIds,
      expiresAt
    });

  } catch (error) {
    console.error("Error locking seats:", error);
    return res.status(500).json({ message: "Server lock evaluation failure" });
  }
};

exports.checkout = async (req, res) => {
  const client = await db.connect();
  const idempotencyKey = req.headers['idempotency-key'];

  if (!idempotencyKey) {
    return res.status(400).json({ message: "Idempotency-Key header is required" });
  }

  try {
    const idempotencyCheck = await redis.get(`idempotency:${idempotencyKey}`);
    if (idempotencyCheck) {
      return res.status(200).json(JSON.parse(idempotencyCheck));
    }

    const { showId, seatIds, amount, userId = "USER_MOCK_1" } = req.body;

    await client.query('BEGIN');

    const bookingRes = await client.query(
      `INSERT INTO bookings (user_id, show_id, seat_ids, amount, status) 
       VALUES ($1, $2, $3, $4, 'CONFIRMED') RETURNING id, created_at`,
      [userId, showId, JSON.stringify(seatIds), amount]
    );

    const bookingId = `BK_${bookingRes.rows[0].id}`;

    await client.query('COMMIT');

    const responsePayload = {
      message: "Booking confirmed successfully!",
      bookingId,
      seats: seatIds,
      totalPaid: amount
    };

    await redis.set(`idempotency:${idempotencyKey}`, JSON.stringify(responsePayload), 'EX', 86400);

    return res.status(200).json(responsePayload);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Checkout transaction failed:", error);
    return res.status(500).json({ message: "Checkout processing failed" });
  } finally {
    client.release();
  }
};