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
      console.log('✅ Connected to MySQL (Unified Database)');
      db.on('error', (err) => {
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') setTimeout(initDb, 2000);
      });
    } catch (err) {
      console.warn('⚠️ MySQL connection skipped/unavailable:', err.message);
    }
  }
  initDb();
} else {
  console.log('ℹ️ Running in Signaling/Webrtc mode without local MySQL requirement');
}

// Registration Endpoint (Now using MySQL)
app.post('/api/register', async (req, res) => {
  try {
    const { firstname, email, password, mobile, whatsapp, city, state, is_consultant } = req.body;
    
    // Check if user exists in MySQL
    const [existing] = await db.execute('SELECT id FROM marketplace_users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ status: 'error', message: 'User already exists' });
    }

    // Insert into MySQL
    await db.execute(
      'INSERT INTO marketplace_users (firstname, email, password, mobile, whatsapp, city, state, is_consultant) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [firstname, email, password, mobile, whatsapp, city, state, is_consultant || '0']
    );
    
    res.json({ status: 'success', message: 'Registration successful (MySQL)!' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Login Endpoint (Now using MySQL)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.execute('SELECT * FROM marketplace_users WHERE email = ? AND password = ?', [email, password]);
    
    if (users.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    const user = users[0];
    await db.execute('UPDATE marketplace_users SET is_online = 1, last_seen = NOW() WHERE id = ?', [user.id]);
    
    res.json({ status: 'success', data: { id: user.id, firstname: user.firstname, email: user.email } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// AI Agent Endpoint
app.post('/api/ai/chat', async (req, res) => {
    const { message, history } = req.body;
    const contents = (history || []).map(msg => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] }));
    contents.push({ role: "user", parts: [{ text: message }] });

    const postData = JSON.stringify({ contents });
    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    };

    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => { res.json(JSON.parse(data)); });
    });
    request.write(postData);
    request.end();
});

// Astrology Engine Endpoint (Swiss Ephemeris - NASA JPL Accurate)
const { calculateAstrology } = require('./astrologyEngineForChatServer.cjs');
app.post('/api/astrology/kundli', calculateAstrology);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
  socket.on('join', (data) => {
    socket.userId = String(data.userId || data);
    socket.join(socket.userId);
    io.emit('status_update', { userId: socket.userId, isOnline: true });
  });

  socket.on('send_message', (data) => {
    io.to(String(data.receiverId)).emit('receive_message', data);
  });

  // Typing status indicator
  socket.on('typing', (data) => {
    const receiverId = String(data.receiverId || data.receiver_id || '');
    const senderId = String(data.senderId || data.sender_id || '');
    const conversationId = data.conversationId || data.conversation_id;

    io.to(receiverId).emit('user_typing', {
      senderId,
      conversationId,
      isTyping: data.isTyping
    });
  });

  // Tracker Notifications
  socket.on('new_tracker_entry', (data) => {
    const expertId = String(data.expertId || '');
    if (expertId) {
      console.log(`New tracker entry for expert ${expertId} from ${data.userName}`);
      io.to(expertId).emit('notify_new_problem', {
        userName: data.userName,
        problem: data.problem,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('expert_tracker_response', (data) => {
    const userId = String(data.userId || '');
    if (userId) {
      console.log(`Expert guidance for user ${userId} from ${data.expertName}`);
      io.to(userId).emit('notify_expert_guidance', {
        expertName: data.expertName,
        problem: data.problem,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Screen Share Signaling Handlers
  socket.on('screenshare_offer', (data) => {
    const receiverId = String(data.receiverId || '');
    console.log(`Forwarding offer from ${data.senderId} to ${receiverId}`);
    io.to(receiverId).emit('screenshare_offer', data);
  });

  socket.on('screenshare_answer', (data) => {
    const receiverId = String(data.receiverId || '');
    console.log(`Forwarding answer from ${data.senderId} to ${receiverId}`);
    io.to(receiverId).emit('screenshare_answer', data);
  });

  socket.on('screenshare_candidate', (data) => {
    const receiverId = String(data.receiverId || '');
    console.log(`Forwarding candidate from ${data.senderId} to ${receiverId}`);
    io.to(receiverId).emit('screenshare_candidate', data);
  });

  socket.on('screenshare_stop', (data) => {
    const receiverId = String(data.receiverId || '');
    console.log(`Stopping screen share for ${receiverId}`);
    io.to(receiverId).emit('screenshare_stop', data);
  });

  // ─── Video / Audio Call Signaling ──────────────────────────────────────────
  socket.on('call_offer', (data) => {
    const receiverId = String(data.receiverId || '');
    const isBroadcast = data.isBroadcast || false;
    console.log(`[CALL] call_offer from ${data.senderId} to ${receiverId} (type: ${data.callType}, broadcast: ${isBroadcast})`);
    
    if (isBroadcast) {
      io.to(`broadcast_${data.senderId}`).emit('call_offer', data);
    } else {
      io.to(receiverId).emit('call_offer', data);
    }
  });

  socket.on('call_answer', (data) => {
    const receiverId = String(data.receiverId || '');
    console.log(`[CALL] call_answer from ${data.senderId} to ${receiverId}`);
    io.to(receiverId).emit('call_answer', data);
  });

  socket.on('call_candidate', (data) => {
    const receiverId = String(data.receiverId || '');
    const isBroadcast = data.isBroadcast || false;
    if (isBroadcast && data.role === 'expert') {
        io.to(`broadcast_${data.senderId}`).emit('call_candidate', data);
    } else {
        io.to(receiverId).emit('call_candidate', data);
    }
  });

  socket.on('call_end', (data) => {
    const receiverId = String(data.receiverId || '');
    const isBroadcast = data.isBroadcast || false;
    console.log(`[CALL] call_end from ${data.senderId} to ${receiverId}`);
    
    if (isBroadcast) {
        io.to(`broadcast_${data.senderId}`).emit('call_end', data);
    } else {
        io.to(receiverId).emit('call_end', data);
    }
  });

  socket.on('call_rejected', (data) => {
    const receiverId = String(data.receiverId || '');
    console.log(`[CALL] call_rejected from ${data.senderId} to ${receiverId}`);
    io.to(receiverId).emit('call_rejected', data);
  });

  socket.on('request_call_offer', (data) => {
    const receiverId = String(data.receiverId || '');
    console.log(`[CALL] request_call_offer from ${data.senderId} to ${receiverId}`);
    io.to(receiverId).emit('request_call_offer', data);
  });

  // LIVE STREAMING
  socket.on('start_live', (data) => {
    socket.expertId = String(data.expertId);
    socket.join(`live_${data.expertId}`);
    socket.broadcast.emit('expert_is_live', data);
  });

  socket.on('join_live', (data) => {
    socket.join(`live_${data.expertId}`);
    io.to(data.expertId).emit('viewer_joined', { viewerId: data.userId });
  });

  socket.on('live_signal', (data) => {
    io.to(data.to).emit('live_signal', { signal: data.signal, from: data.from });
  });

  socket.on('live_chat_message', (data) => {
    io.to(`live_${data.expertId}`).emit('receive_live_chat', {
      ...data,
      timestamp: data.timestamp || new Date().toISOString()
    });
  });

  socket.on('stop_live', async (data) => {
    const expertId = String(data.expertId);
    io.to(`live_${expertId}`).emit('live_ended');
    socket.broadcast.emit('live_ended', { expertId });
    if (socket.expertId) {
      delete socket.expertId;
    }
    if (db) {
      try {
        await db.execute('UPDATE marketplace_users SET is_live = 0 WHERE id = ?', [expertId]);
        await db.execute('UPDATE expert_profiles SET is_live = 0 WHERE user_id = ?', [expertId]);
        console.log(`DB updated: Expert ${expertId} is no longer live`);
      } catch (err) {
        console.error('Failed to update live status on stop_live:', err.message);
      }
    }
  });

  socket.on('disconnect', async () => {
    if (socket.userId) io.emit('status_update', { userId: socket.userId, isOnline: false });
    
    if (socket.expertId) {
      const expertId = socket.expertId;
      console.log(`Expert ${expertId} disconnected. Ending live session.`);
      io.to(`live_${expertId}`).emit('live_ended');
      socket.broadcast.emit('live_ended', { expertId });
      delete socket.expertId;
      if (db) {
        try {
          await db.execute('UPDATE marketplace_users SET is_live = 0 WHERE id = ?', [expertId]);
          await db.execute('UPDATE expert_profiles SET is_live = 0 WHERE user_id = ?', [expertId]);
          console.log(`DB updated: Expert ${expertId} is no longer live due to disconnect`);
        } catch (err) {
          console.error('Failed to update live status on disconnect:', err.message);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Chat server running on port ${PORT}`));
