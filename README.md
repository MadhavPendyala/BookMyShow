🎬 BookMyShow Engine — Dynamic & Real-Time Seat Mapping
An enterprise-grade, canvas-rendered cinema and event seat booking engine built with React, Node.js, Socket.io, and Redis. 
It is engineered to process dynamic layout schemas and handle high-concurrency real-time seat locks using atomic optimistic locking.

✨ System Architecture & Highlights
  
  1. Schema-Driven Canvas Rendering: Operates entirely without hardcoded seat coordinates. 
       Renders everything from boutique 30-seat screening rooms to multi-balcony 1,000+ seat arenas dynamically using declarative JSON layout configurations.

  2. Real-Time WebSocket Synchronization: Utilizes Socket.io event channels to broadcast seat selection events instantly across all concurrent active user 
     sessions viewing the same showtime.
  
  3. Atomic Optimistic Locking: Integrates Redis atomic lock strategies to resolve race conditions and guarantee absolute data consistency when multiple 
     users attempt to claim the exact same seat within milliseconds of each other.
    
  4. Accessibility & Custom Seat Types: Features native modal alerts and tailored UI visual indicators for Wheelchair spaces, Companion seats, and VIP Recliners.

  5. Automated Expiry & Fault Tolerance: Features real-time state recovery that automatically releases held seats back to the general pool upon hold timeout or
     unexpected socket disconnections.

🛠️ Tech Stack

Frontend: React.js, HTML5 Canvas API, Socket.io Client

Backend: Node.js, Express.js, Socket.io Server

In-Memory Cache: Redis (Distributed locking & real-time state management)

🚀 Deployment & Operations Guide

System Requirements: Before running the application, ensure the following services are installed and active on your environment:

Node.js Runtime (v16.0.0 or higher)

Redis Server (Running on default port 6379)

📥 1. Repository Setup
Clone the remote repository to your local directory and install the necessary system dependencies across both the client and server environments.

⚙️ 2. Database Service Configuration
Ensure your local or containerized Redis daemon is active and listening for connections. Redis is responsible for maintaining atomic key locks and tracking 
ephemeral session holds across all active server instances.

🖥️ 3. Execution Order
To run the complete system locally:

Launch the WebSocket & Lock Server: Start the Node.js backend. The server will initialize HTTP and WebSocket listeners while establishing a persistent connection to Redis.

Launch the Client Interface: Start the React development environment. The client will establish a WebSocket handshake with the backend and pull the initial seat state matrix for the selected showtime.

🧪 Real-Time Concurrency Verification
1. To observe real-time lock synchronization and collision handling: 
    
  Open the web client in a primary browser tab (User A).

  Open a second window in Incognito mode side-by-side, pointing to the same showtime ID (User B).

2. Select an available seat in User A's window:

  User A observes the seat transition instantly to Selected (Red).

  User B observes the seat transition to Held (Blue) in real time without refreshing the page.

If User B attempts to click the held seat simultaneously, the backend Redis lock rejects the attempt and returns an instant conflict notification to User B.

📐 Layout Schema Capability
The engine processes structured configuration layouts defining screen metadata, global canvas dimensions, aisle offsets, custom row labels, pricing tiers, 
and section colors. This abstraction decoupling allows new cinema venues to be configured entirely through database schemas without requiring client-side code changes.

📄 License
Distributed under the MIT License.
