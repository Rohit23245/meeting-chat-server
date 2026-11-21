const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const mysql = require('mysql2/promise');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

// Serve Complete React App & Meeting System
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.redirect('/occult/meet');
});
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBOO5uDLHJpK5FTBV6wTppqIhMTYsqZlhU';

// MySQL Configuration (Optional - only connects if DB_HOST is explicitly provided and not localhost)
const dbHost = process.env.DB_HOST;
let db = null;

if (dbHost && dbHost !== 'localhost' && dbHost !== '127.0.0.1') {
  const dbConfig = {
    host: dbHost,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'myvastutool',
    port: process.env.DB_PORT || 3306
  };

  async function initDb() {
    try {
      if (db) await db.end().catch(() => {});
      db = await mysql.createConnection(dbConfig);
      console.log('Connected to MySQL (Unified Database)');
      db.on('error', (err) => {
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') setTimeout(initDb, 2000);
      });
    } catch (err) {
      console.warn('MySQL connection skipped/unavailable:', err.message);
    }
  }
  initDb();
} else {
  console.log('Running in Signaling/WebRTC mode without local MySQL requirement');
}

// ----------------------------------------------------------------------------
// P2P SWARM / TREE RELAY MESH TRACKER (SCALES TO 1,000+ VIEWERS)
// ----------------------------------------------------------------------------
const roomSwarm = {}; // roomId -> { hostId, nodes: {} }

io.on('connection', (socket) => {
  // Register Host for P2P Swarm
  socket.on('p2p_register_host', (data) => {
    const roomId = data.roomId;
    roomSwarm[roomId] = {
      hostId: socket.id,
      nodes: {}
    };
    socket.roomId = roomId;
    socket.isHost = true;
    console.log('[P2P MESH] Host registered for room:', roomId);
    socket.emit('p2p_host_registered', { success: true });
  });

  // Assign Optimal Parent in Swarm Tree for new Viewer
  socket.on('p2p_join_viewer', (data) => {
    const roomId = data.roomId;
    const userId = data.userId;
    const swarm = roomSwarm[roomId];
    if (!swarm || !swarm.hostId) {
      socket.emit('p2p_swarm_error', { message: 'Host not online or swarm inactive' });
      return;
    }

    socket.roomId = roomId;
    socket.userId = userId;

    // Find parent with less than 3 children (degree limit = 3 for low latency)
    let assignedParent = swarm.hostId;
    let minLevel = 1;

    const candidates = [swarm.hostId, ...Object.keys(swarm.nodes)];
    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      if (cand === swarm.hostId) {
        const hostChildren = Object.values(swarm.nodes).filter(n => n.parent === swarm.hostId);
        if (hostChildren.length < 3) {
          assignedParent = swarm.hostId;
          minLevel = 1;
          break;
        }
      } else {
        const node = swarm.nodes[cand];
        if (node && node.children.length < 3) {
          assignedParent = cand;
          minLevel = node.level + 1;
          break;
        }
      }
    }

    swarm.nodes[socket.id] = {
      parent: assignedParent,
      children: [],
      level: minLevel,
      userId: userId
    };

    if (swarm.nodes[assignedParent]) {
      swarm.nodes[assignedParent].children.push(socket.id);
    }

    console.log('[P2P MESH] Viewer', socket.id, 'assigned parent:', assignedParent, 'Level:', minLevel);
    socket.emit('p2p_assigned_parent', { parentId: assignedParent, level: minLevel });
    io.to(assignedParent).emit('p2p_child_connecting', { childId: socket.id, userId });
  });

  // Relay Signaling between Parent & Child
  socket.on('p2p_mesh_signal', (data) => {
    io.to(data.targetId).emit('p2p_mesh_signal', {
      fromId: socket.id,
      signal: data.signal,
      type: data.type
    });
  });

  // Existing Standard Signaling Handlers
  socket.on('join', (data) => {
    socket.userId = data.userId;
    socket.join(data.userId);
    socket.join(data.sessionId);
    if (data.role) socket.role = data.role;
    console.log(`User ${data.userId} joined rooms`);
  });

  socket.on('call_offer', (data) => {
    const receiverId = String(data.receiverId);
    if (data.isBroadcast) {
      io.to(`broadcast_${data.senderId}`).emit('call_offer', data);
    } else {
      io.to(receiverId).emit('call_offer', data);
    }
  });

  socket.on('call_answer', (data) => {
    const receiverId = String(data.receiverId);
    io.to(receiverId).emit('call_answer', data);
  });

  socket.on('call_candidate', (data) => {
    const receiverId = String(data.receiverId);
    if (data.isBroadcast) {
      io.to(`broadcast_${data.senderId}`).emit('call_candidate', data);
    } else {
      io.to(receiverId).emit('call_candidate', data);
    }
  });

  socket.on('join_live', (data) => {
    socket.join(`live_${data.expertId}`);
  });

  socket.on('live_chat_message', (data) => {
    io.to(`live_${data.expertId}`).emit('receive_live_chat', data);
  });

  socket.on('disconnect', () => {
    if (socket.roomId && roomSwarm[socket.roomId]) {
      const swarm = roomSwarm[socket.roomId];
      if (socket.isHost) {
        io.to(socket.roomId).emit('p2p_host_ended');
        delete roomSwarm[socket.roomId];
      } else if (swarm.nodes[socket.id]) {
        const myNode = swarm.nodes[socket.id];
        const orphanedChildren = myNode.children || [];
        if (myNode.parent && swarm.nodes[myNode.parent]) {
          swarm.nodes[myNode.parent].children = swarm.nodes[myNode.parent].children.filter(id => id !== socket.id);
        }
        delete swarm.nodes[socket.id];
        orphanedChildren.forEach(childId => {
          io.to(childId).emit('p2p_reconnect_request', { fallbackToHost: true });
        });
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Chat server running on port ${PORT}`));
