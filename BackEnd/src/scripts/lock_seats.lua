-- ============================================================================
-- Redis Lua Script: Atomic Multi-Seat Reservation Lock Engine
-- ============================================================================
--
-- KEYS: Array of Redis keys for each requested seat.
--       Format: lock:<show_id>:<seat_id>
--       Example: KEYS[1] = "lock:SHOW_101:A12", KEYS[2] = "lock:SHOW_101:A13"
--
-- ARGV: Array of parameters passed to the script.
--       ARGV[1] = Lock TTL in seconds (e.g., 480 for an 8-minute hold window)
--       ARGV[2] = Unique identifier for user/session (e.g., "USER_UUID_9876")
--
-- RETURNS:
--       Success: { 1, "SUCCESS" }
--       Failure: { 0, <failing_seat_key> }  -- Returns the seat already taken
-- ============================================================================

local ttl = tonumber(ARGV[1])
local userId = ARGV[2]

-- STEP 1: Verify that NONE of the requested seats are already locked
for i, seatKey in ipairs(KEYS) do
    local isLocked = redis.call('EXISTS', seatKey)
    if isLocked == 1 then
        -- Conflict found! Abort early before setting any locks.
        return { 0, seatKey }
    end
end

-- STEP 2: All seats are free! Atomically lock ALL requested seats
for i, seatKey in ipairs(KEYS) do
    -- SET key value EX ttl
    redis.call('SET', seatKey, userId, 'EX', ttl)
end

-- STEP 3: Return success response
return { 1, "SUCCESS" }