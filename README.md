# 🎬 BookMyShow Engine — Dynamic & Real-Time Seat Mapping

![Node.js](https://img.shields.io/badge/Node.js-v16%2B-green?style=flat-square&logo=node.js)
![React](https://img.shields.io/badge/React-18%2B-blue?style=flat-square&logo=react)
![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-black?style=flat-square&logo=socket.io)
![Redis](https://img.shields.io/badge/Redis-Optimistic%20Locking-dc382d?style=flat-square&logo=redis)

An end-to-end, high-concurrency event seat booking solution that leverages **WebSockets (Socket.io)** and **Redis Atomic Locks (`SET NX EX`)** to eliminate race conditions when thousands of users interact with the same seat map simultaneously. Built using an HTML5 Canvas engine, it dynamically renders cinema layouts from structured JSON schemas into active, real-time interactive maps: **Available**, **Held (Blue)**, and **Selected (Red)**.

---

## Project Overview & Scenario

Modern ticketing platforms like **BookMyShow** handle high-traffic surges during blockbuster movie launches and live concert sales. When multiple users select the same seat in the exact same millisecond, naive backend architectures suffer from double-booking race conditions. This project automates real-time seat synchronization across concurrent sessions and enforces sub-millisecond atomic locking to guarantee zero collision rates.

### Key Objectives

* **Zero Double-Booking Guarantee:** Execute atomic lock acquisition in Redis to safely resolve simultaneous click events.
* **Instant UI Synchronization:** Broadcast seat selection states across all connected WebSocket clients without manual page refreshes.
* **Schema-Driven Flexibility:** Render dynamic venue layouts (30-seat screening rooms to 1,000+ seat stadiums) directly from JSON database configurations.
* **Fault-Tolerant State Recovery:** Automatically release held seats upon user disconnects or countdown timer expirations.

---

## System Architecture

The system uses a decoupled event-driven architecture designed for low latency and distributed state safety.


  +------------------+                    +------------------+
  |   User A Client  |                    |   User B Client  |
  |  (React Canvas)  |                    |  (React Canvas)  |
  +--------+---------+                    +--------+---------+
           |                                       ^
           | 1. LOCK_SEAT (WebSocket)              | 4. SEAT_LOCKED (Broadcast)
           v                                       |
  +------------------------------------------------+---------+
  |                  Node.js Server                          |
  |             (Express + Socket.io Server)                 |
  +------------------------+---------------------------------+
                           |
                           | 2. SET showtime:1:seat:C12 payload NX EX 480
                           v
                  +-----------------+
                  |  Redis Cache    |  3. Returns "OK" (Lock Acquired)
                  |  (Atomic Store) |------------------+
                  +-----------------+                  |
                                                       v
                                              [ Broadcast Event ]


Architectural Workflow
Client Event Trigger: User A clicks an available seat (C12), emitting a LOCK_SEAT event via WebSockets to the Node.js backend.

Atomic Lock Validation: The Node.js server executes an atomic SET key value NX EX 480 command on Redis.

NX (Not Exist): Ensures the key is written only if no lock key currently exists.

EX (Expiry): Sets an automatic 8-minute TTL window to prevent orphaned holds.

Collision Handling:

If Lock Succeeds: Redis returns "OK". The backend broadcasts SEAT_LOCKED to all connected clients in the showtime room.

If Lock Fails (Race Condition Lost): Redis returns null. The backend emits a LOCK_FAILED event exclusively back to User A to reject the selection gracefully.

Key Features
📐 Schema-Driven Canvas Rendering: Operates without hardcoded seat coordinates, dynamically rendering row labels, aisle gaps, recliners, and wheelchair spaces.

⚡ Real-Time WebSocket Synchronization: Uses Socket.io event channels to broadcast seat selection events instantly to all active users viewing the same showtime.

🔒 Atomic Optimistic Locking: Integrates Redis atomic lock strategies (SET NX EX) to handle race conditions gracefully under high load.

⏱️ Automated Hold Expiry: Built-in 8-minute TTL hold window that releases locked seats back to the general pool automatically.

Tech Stack & System Requirements
Technology Stack
Frontend: React.js, HTML5 Canvas API, Socket.io Client

Backend: Node.js, Express.js, Socket.io Server

In-Memory Cache: Redis (Distributed locking & state management)

Execution Steps
Start the In-Memory Store: Launch your local or Docker-based Redis daemon listening on port 6379.

Launch the WebSocket & Lock Server: Run node server.js to initialize HTTP listeners, WebSocket channels, and Redis connection pools.

Launch the React Client: Start the frontend application to establish the client WebSocket handshake and pull initial seat matrices.

Concurrency Test Scenario
Open the application in a primary browser tab (User A).

Open an Incognito window side-by-side pointing to the same showtime ID (User B).

Select an available seat in User A's window:

User A observes the seat turn Selected (Red).

User B observes the seat transition to Held (Blue) instantly without refreshing.

If User B attempts to click the same seat simultaneously, the backend Redis lock gracefully rejects the request and returns a conflict alert.

License
Distributed under the MIT License.
                  
