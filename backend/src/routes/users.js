const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const users = db.prepare(
    'SELECT id, username, full_name, role, shop, status, last_active, created_at FROM users ORDER BY created_at DESC'
  ).all();
  db.close();
  res.json(users);
});

router.get('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const user = db.prepare(
    'SELECT id, username, full_name, role, shop, status, last_active, created_at FROM users WHERE id = ?'
  ).get(req.params.id);
  db.close();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (req.user.role !== 'admin' && req.user.id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(user);
});

router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, full_name, role, shop } = req.body;

  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ error: 'Username, password, full_name, and role are required' });
  }

  if (role !== 'admin' && role !== 'worker') {
    return res.status(400).json({ error: 'Role must be admin or worker' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const db = getDb();
  try {
    const result = db.prepare(
      'INSERT INTO users (username, password, full_name, role, shop) VALUES (?, ?, ?, ?, ?)'
    ).run(username, hashedPassword, full_name, role, shop || null);

    db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)')
      .run(req.user.id, 'create_user', `Created user: ${username}`);

    const newUser = db.prepare(
      'SELECT id, username, full_name, role, shop, status, created_at FROM users WHERE id = ?'
    ).get(result.lastInsertRowid);
    db.close();

    res.status(201).json(newUser);
  } catch (err) {
    db.close();
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { full_name, role, shop } = req.body;
  const userId = parseInt(req.params.id, 10);

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);

  if (!user) {
    db.close();
    return res.status(404).json({ error: 'User not found' });
  }

  db.prepare(
    'UPDATE users SET full_name = COALESCE(?, full_name), role = COALESCE(?, role), shop = COALESCE(?, shop), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(full_name || null, role || null, shop || null, userId);

  db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)')
    .run(req.user.id, 'update_user', `Updated user ID: ${userId}`);

  const updated = db.prepare(
    'SELECT id, username, full_name, role, shop, status, created_at FROM users WHERE id = ?'
  ).get(userId);
  db.close();

  res.json(updated);
});

router.put('/:id/password', authenticateToken, requireAdmin, (req, res) => {
  const { password } = req.body;
  const userId = parseInt(req.params.id, 10);

  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);

  if (!user) {
    db.close();
    return res.status(404).json({ error: 'User not found' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(hashedPassword, userId);

  db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)')
    .run(req.user.id, 'reset_password', `Reset password for user ID: ${userId}`);
  db.close();

  res.json({ message: 'Password updated successfully' });
});

router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id, 10);

  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const db = getDb();
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);

  if (!user) {
    db.close();
    return res.status(404).json({ error: 'User not found' });
  }

  db.prepare('UPDATE tasks SET assigned_to = NULL WHERE assigned_to = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)')
    .run(req.user.id, 'delete_user', `Deleted user: ${user.username}`);
  db.close();

  res.json({ message: 'User deleted successfully' });
});

module.exports = router;
