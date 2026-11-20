const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mysql = require('mysql2/promise');
const https = require('https');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = 'mongodb+srv://rajatsharma45879_db_user:rCyhF6MkvKY4%25rr@cluster0.gxdgkf3.mongodb.net/myvastutool?retryWrites=true&w=majority&appName=Cluster0';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDlAQU0IoGNhh6D-wzs2tFuxTRWfeqpaHM';

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB (myvastutool)'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// MongoDB User Schema
const userSchema = new mongoose.Schema({
  firstname: String,
  email: { type: String, unique: true },
  password: { type: String, required: true },
  mobile: String,
  whatsapp: String,
  city: String,
  state: String,
  is_consultant: { type: String, default: "0" },
  is_verified: { type: Number, default: 1 },
  is_online: { type: Number, default: 0 },
  last_seen: { type: Date, default: Date.now },
  device_id: String,
  created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Registration Endpoint (Dynamic MongoDB)
app.post('/api/register', async (req, res) => {
  try {
    const { firstname, email, password, mobile, whatsapp, city, state, is_consultant } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ status: 'error', message: 'User already exists with this email' });
    }

    const newUser = new User({
      firstname,
      email,
      password, // In a real app, hash this!
      mobile,
      whatsapp,
      city,
      state,
      is_consultant
    });

    await newUser.save();
    res.json({ status: 'success', message: 'Registration successful!', data: { email: newUser.email } });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ status: 'error', message: 'Server error during registration' });
  }
});

// Login Endpoint (Dynamic MongoDB)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, device_id } = req.body;
    
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    // Update online status and device ID
    user.is_online = 1;
    user.last_seen = new Date();
    user.device_id = device_id;
    await user.save();

    res.json({ 
      status: 'success', 
      message: 'Login successful!', 
      data: { 
        id: user._id,
        firstname: user.firstname,
        email: user.email,
        is_verified: user.is_verified 
      } 
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ status: 'error', message: 'Server error during login' });
  }
});

// User Profile Endpoint (Dynamic MongoDB)
app.post('/api/user_profile', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }
    // Convert to format expected by frontend
    const userData = {
      ...user.toObject(),
      id: user._id,
      status: true,
      data: {
        id: user._id,
        firstname: user.firstname,
        email: user.email,
        mobile: user.mobile,
        city: user.city,
        state: user.state,
        is_verified: user.is_verified,
        is_online: user.is_online
      }
    };
    res.json(userData);
  } catch (err) {
    console.error('Profile Error:', err);
    res.status(500).json({ status: false, message: 'Server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    db: db ? 'connected' : 'disconnected',
    activeUsers: activeUsers.size,
    gemini: !!GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// AI Agent Endpoint (Gemini Unlimited Native Audio)
app.post('/api/ai/chat', async (req, res) => {
    const { message, history } = req.body;
    const systemPrompt = "You are the official Vastu Tool AI Assistant. TOPIC: Only Vastu & Platform help. If off-topic, politely redirect. SCRIPT: ALWAYS use HINDI DEVANAGARI. Keep it concise.";

    const geminiHistory = (history || []).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const contents = geminiHistory.length === 0 
        ? [{ role: "user", parts: [{ text: `SYSTEM INSTRUCTIONS:\n${systemPrompt}\n\nUSER MESSAGE:\n${message}` }] }]
        : [...geminiHistory, { role: "user", parts: [{ text: message }] }];

    const postData = JSON.stringify({ contents });

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
            try {
                res.json(JSON.parse(data));
            } catch (e) {
                res.status(500).json({ error: 'Failed to parse AI response' });
            }
        });
    });

    request.on('error', (error) => {
        console.error('HuggingFace Error:', error.message);
        res.status(500).json({ error: 'AI Agent failed to respond' });
    });

    request.write(postData);
    request.end();
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Database Connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'myvastutool',
  port: process.env.DB_PORT || 3306,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : null
};

console.log('--- Chat Server Startup ---');
console.log('Time:', new Date().toLocaleString());
console.log('Attemping DB connection to:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port,
  ssl: !!dbConfig.ssl
});

let db;
async function initDb() {
  try {
    if (db) await db.end().catch(() => {});
    db = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL for real-time tracking');
    
    db.on('error', (err) => {
      console.error('❌ MySQL DB Error:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
        console.log('Re-initializing DB connection...');
        setTimeout(initDb, 2000);
      }
    });
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    setTimeout(initDb, 5000);
  }
}
initDb();

setInterval(async () => {
  if (db && db.connection && db.connection.readyState !== 'closed') {
    try {
      await db.execute('UPDATE marketplace_users SET is_online = 0 WHERE is_online = 1 AND last_seen < (NOW() - INTERVAL 5 MINUTE)');
      // Permanent fallback: if user is offline, they cannot be live
      await db.execute('UPDATE marketplace_users SET is_live = 0 WHERE is_online = 0 AND is_live = 1');
      await db.execute('UPDATE expert_profiles SET is_live = 0 WHERE user_id IN (SELECT id FROM marketplace_users WHERE is_online = 0)');
    } catch (err) {
      console.error('Periodic offline sync failed:', err.message);
    }
  }
}, 60000);

const activeUsers = new Map(); // userId -> { socketId, role }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', async (data) => {
    const userId = String(typeof data === 'object' ? data.userId : data);
    const role = typeof data === 'object' ? data.role : 'user';

    socket.userId = userId;
    socket.join(userId); // JOIN THE USER'S OWN ROOM
    
    // NEW: Join Broadcast Rooms
    if (db) {
        try {
            if (role === 'expert') {
                // Experts join their own broadcast room
                socket.join(`broadcast_${userId}`);
                console.log(`Expert ${userId} joined broadcast room broadcast_${userId}`);
            } else {
                // Users join broadcast rooms of experts they follow
                const [follows] = await db.execute('SELECT expert_id FROM marketplace_follows WHERE user_id = ?', [userId]);
                follows.forEach(f => {
                    socket.join(`broadcast_${f.expert_id}`);
                    console.log(`User ${userId} joined broadcast room broadcast_${f.expert_id}`);
                });
            }
        } catch (err) {
            console.error('Error joining broadcast rooms:', err);
        }
    }

    activeUsers.set(userId, { socketId: socket.id, role });
    console.log(`User ${userId} (${role}) joined room ${userId} (Socket ID: ${socket.id})`);

    if (db) {
      try {
        await db.execute(
          'UPDATE marketplace_users SET is_online = 1, last_seen = NOW() WHERE id = ?',
          [userId]
        );
      } catch (err) {
        console.error('DB update failed on join:', err);
      }
    }
    
    // Broadcast status to others
    io.emit('status_update', { userId, isOnline: true });

    // NEW: Send current list of online users to the user who just joined
    const onlineList = Array.from(activeUsers.keys());
    socket.emit('initial_online_users', onlineList);
  });

  socket.on('send_message', (data) => {
    const receiverId = String(data.receiverId || data.receiver_id || '');
    const senderId = String(data.senderId || data.sender_id || '');
    const conversationId = data.conversationId || data.conversation_id;
    const isBroadcast = data.type === 'broadcast';
    
    console.log(`${isBroadcast ? 'Broadcast' : 'Message'} from ${senderId} to ${receiverId}: ${data.message} (Conv: ${conversationId})`);

    if (isBroadcast) {
        // Broadcast to entire community room
        io.to(`broadcast_${senderId}`).emit('receive_message', {
            sender_id: senderId,
            message: data.message,
            conversation_id: conversationId,
            sender_name: data.senderName || data.sender_name,
            type: 'broadcast',
            created_at: new Date().toISOString()
        });
    } else {
        // Emit to the receiver's private room
        io.to(receiverId).emit('receive_message', {
          sender_id: senderId,
          receiver_id: receiverId,
          message: data.message,
          conversation_id: conversationId,
          sender_name: data.senderName || data.sender_name,
          created_at: new Date().toISOString()
        });
    }
  });

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

  // ─── LIVE STREAMING SIGNALING ──────────────────────────────────────────
  // Dedicated Scalable Webinar Broadcast Relay (1-to-1000 Users)
  socket.on('webinar_start', (data) => {
    const { expertId, expertName } = data;
    socket.webinarRoomId = `webinar_${expertId}`;
    socket.join(socket.webinarRoomId);
    console.log(`[WEBINAR] Host ${expertName} (${expertId}) started webinar broadcast`);
    socket.broadcast.emit('webinar_is_live', { expertId, expertName });
  });

  socket.on('webinar_join', (data) => {
    const { expertId, userId, userName } = data;
    const room = `webinar_${expertId}`;
    socket.join(room);
    console.log(`[WEBINAR] User ${userName || userId} joined webinar ${expertId}`);
    // Emit current attendee count
    const numClients = io.sockets.adapter.rooms.get(room)?.size || 1;
    io.to(room).emit('webinar_stats', { attendeesCount: numClients });
  });

  socket.on('webinar_frame_chunk', (data) => {
    // Zero-overhead binary/frame relay from 1 host to 1000 viewers
    const { expertId, chunk } = data;
    socket.to(`webinar_${expertId}`).emit('webinar_frame_receive', { chunk });
  });

  socket.on('webinar_chat', (data) => {
    const { expertId, message, senderName, senderId } = data;
    io.to(`webinar_${expertId}`).emit('webinar_chat_receive', {
      senderName,
      senderId,
      message,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('webinar_stop', (data) => {
    const { expertId } = data;
    io.to(`webinar_${expertId}`).emit('webinar_ended');
    console.log(`[WEBINAR] Webinar ${expertId} ended`);
  });
  // ───────────────────────────────────────────────────────────────────────────
  socket.on('start_live', (data) => {
    const { expertId, expertName } = data;
    console.log(`[LIVE] Expert ${expertName} (${expertId}) is now LIVE`);
    socket.expertId = String(expertId);
    socket.join(`live_${expertId}`);
    // Notify followers or anyone on the platform
    socket.broadcast.emit('expert_is_live', { expertId, expertName });
  });

  socket.on('join_live', (data) => {
    const { expertId, userId, isMeeting } = data;
    socket.join(`live_${expertId}`);
    console.log(`[LIVE] User ${userId} joined live stream/meeting of ${expertId}`);
    // In meetings (Occult Meet), do NOT auto-notify expert or auto-handshake. Handshake only occurs when host accepts request!
    if (!isMeeting) {
      io.to(expertId).emit('viewer_joined', { viewerId: userId });
    }
  });

  socket.on('live_signal', (data) => {
    const { to, signal, from } = data;
    io.to(to).emit('live_signal', { signal, from });
  });

  socket.on('live_chat_message', (data) => {
    const { expertId } = data;
    io.to(`live_${expertId}`).emit('receive_live_chat', {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
    });
  });

  socket.on('stop_live', async (data) => {
    const { expertId } = data;
    io.to(`live_${expertId}`).emit('live_ended');
    socket.broadcast.emit('live_ended', { expertId });
    console.log(`[LIVE] Live stream ${expertId} ended`);
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
  // ───────────────────────────────────────────────────────────────────────────

  socket.on('disconnect', async () => {
    const userId = socket.userId;
    console.log(`User ${userId} disconnected`);

    if (userId) {
      const userData = activeUsers.get(userId);
      activeUsers.delete(userId);
      if (db) {
        try {
          await db.execute(
            'UPDATE marketplace_users SET is_online = 0, last_seen = NOW() WHERE id = ?',
            [userId]
          );
          if (userData && userData.role === 'expert') {
              await db.execute('UPDATE marketplace_users SET is_live = 0 WHERE id = ?', [userId]);
              await db.execute('UPDATE expert_profiles SET is_live = 0 WHERE user_id = ?', [userId]);
              io.to(`live_${userId}`).emit('live_ended');
              socket.broadcast.emit('live_ended', { expertId: userId });
              console.log(`DB updated: Expert ${userId} is no longer live due to disconnect`);
          }
        } catch (err) {
          console.error('DB update failed on disconnect:', err);
        }
      }
      // Broadcast offline status even if DB update fails
      io.emit('status_update', { userId, isOnline: false });
    }

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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Chat server running on port ${PORT}`);
});
