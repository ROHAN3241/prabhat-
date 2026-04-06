const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'prabhat-medical-local-secret';

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  db.close();

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, shop: user.shop },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const updateDb = getDb();
  updateDb.prepare('UPDATE users SET status = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?')
    .run('online', user.id);
  updateDb.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)')
    .run(user.id, 'login', `${user.full_name} logged in`);
  updateDb.close();

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      shop: user.shop,
    },
  });
});

router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const db = getDb();
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run('offline', decoded.id);
      db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)')
        .run(decoded.id, 'logout', 'User logged out');
      db.close();
    } catch {
      // Token might be expired; still allow logout
    }
  }

  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
