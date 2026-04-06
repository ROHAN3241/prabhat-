require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const path = require('path');
const { initializeDatabase, seedDatabase, getDb } = require('./db/database');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const analyticsRoutes = require('./routes/analytics');

const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || 'prabhat-medical-local-secret';
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), name: 'Prabhat Medical Server' });
});

const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Map();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  if (!token) {
    ws.close(4001, 'Authentication required');
    return;
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    clients.set(ws, user);

    const db = getDb();
    db.prepare('UPDATE users SET status = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?')
      .run('online', user.id);
    db.close();

    broadcastWorkerStatus();

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        handleWebSocketMessage(ws, user, message);
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      const closeDb = getDb();
      closeDb.prepare('UPDATE users SET status = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?')
        .run('offline', user.id);
      closeDb.close();
      broadcastWorkerStatus();
    });

    ws.send(JSON.stringify({ type: 'connected', user: { id: user.id, username: user.username } }));
  } catch {
    ws.close(4003, 'Invalid token');
  }
});

function handleWebSocketMessage(ws, user, message) {
  switch (message.type) {
    case 'task_update':
      broadcast({ type: 'task_update', data: message.data, from: user.username });
      break;
    case 'heartbeat':
      ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
      {
        const db = getDb();
        db.prepare('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
        db.close();
      }
      break;
    default:
      break;
  }
}

function broadcast(message) {
  const data = JSON.stringify(message);
  for (const [client] of clients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}

function broadcastWorkerStatus() {
  const db = getDb();
  const workers = db.prepare(
    "SELECT id, username, full_name, shop, status, last_active FROM users WHERE role = 'worker'"
  ).all();
  db.close();
  broadcast({ type: 'worker_status', data: workers });
}

// Expose broadcast function for external use
app.locals.broadcast = broadcast;

app.get('/{*splat}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
});

const db = initializeDatabase();
seedDatabase(db);
db.close();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  Prabhat Medical - Shop Management`);
  console.log(`========================================`);
  console.log(`  Server running on port ${PORT}`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://0.0.0.0:${PORT}`);
  console.log(`========================================`);
  console.log(`  Default Admin Login:`);
  console.log(`    Username: admin`);
  console.log(`    Password: admin123`);
  console.log(`========================================\n`);
});

module.exports = { app, server };
