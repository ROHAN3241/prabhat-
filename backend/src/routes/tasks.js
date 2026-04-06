const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const db = getDb();
  const { status, shop, assigned_to, date_from, date_to, search } = req.query;

  let query = `
    SELECT t.*, 
      u1.full_name as assigned_to_name, u1.username as assigned_to_username,
      u2.full_name as assigned_by_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.assigned_by = u2.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'worker') {
    query += ' AND t.assigned_to = ?';
    params.push(req.user.id);
  }

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }

  if (shop) {
    query += ' AND t.shop = ?';
    params.push(shop);
  }

  if (assigned_to) {
    query += ' AND t.assigned_to = ?';
    params.push(parseInt(assigned_to, 10));
  }

  if (date_from) {
    query += ' AND t.created_at >= ?';
    params.push(date_from);
  }

  if (date_to) {
    query += ' AND t.created_at <= ?';
    params.push(date_to + ' 23:59:59');
  }

  if (search) {
    query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam);
  }

  query += ' ORDER BY t.created_at DESC';

  const tasks = db.prepare(query).all(...params);

  const taskIds = tasks.map((t) => t.id);
  let itemsMap = {};
  if (taskIds.length > 0) {
    const placeholders = taskIds.map(() => '?').join(',');
    const items = db.prepare(
      `SELECT * FROM task_items WHERE task_id IN (${placeholders})`
    ).all(...taskIds);
    for (const item of items) {
      if (!itemsMap[item.task_id]) itemsMap[item.task_id] = [];
      itemsMap[item.task_id].push(item);
    }
  }

  const result = tasks.map((t) => ({
    ...t,
    items: itemsMap[t.id] || [],
  }));

  db.close();
  res.json(result);
});

router.get('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const task = db.prepare(`
    SELECT t.*, 
      u1.full_name as assigned_to_name,
      u2.full_name as assigned_by_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.assigned_by = u2.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!task) {
    db.close();
    return res.status(404).json({ error: 'Task not found' });
  }

  if (req.user.role === 'worker' && task.assigned_to !== req.user.id) {
    db.close();
    return res.status(403).json({ error: 'Access denied' });
  }

  const items = db.prepare('SELECT * FROM task_items WHERE task_id = ?').all(task.id);
  db.close();

  res.json({ ...task, items });
});

router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { title, description, assigned_to, shop, priority, items } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const db = getDb();

  const result = db.prepare(
    'INSERT INTO tasks (title, description, assigned_to, assigned_by, shop, priority) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(title, description || null, assigned_to || null, req.user.id, shop || null, priority || 'normal');

  const taskId = result.lastInsertRowid;

  if (items && Array.isArray(items)) {
    const insertItem = db.prepare('INSERT INTO task_items (task_id, item_name, quantity) VALUES (?, ?, ?)');
    for (const item of items) {
      insertItem.run(taskId, item.item_name, item.quantity || 1);
    }
  }

  db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)')
    .run(req.user.id, 'create_task', `Created task: ${title}`);

  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  const taskItems = db.prepare('SELECT * FROM task_items WHERE task_id = ?').all(taskId);
  db.close();

  res.status(201).json({ ...newTask, items: taskItems });
});

router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { title, description, assigned_to, shop, priority, status } = req.body;
  const taskId = parseInt(req.params.id, 10);

  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

  if (!task) {
    db.close();
    return res.status(404).json({ error: 'Task not found' });
  }

  db.prepare(`
    UPDATE tasks SET 
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      assigned_to = COALESCE(?, assigned_to),
      shop = COALESCE(?, shop),
      priority = COALESCE(?, priority),
      status = COALESCE(?, status),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title || null, description || null, assigned_to || null, shop || null, priority || null, status || null, taskId);

  db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)')
    .run(req.user.id, 'update_task', `Updated task ID: ${taskId}`);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  const items = db.prepare('SELECT * FROM task_items WHERE task_id = ?').all(taskId);
  db.close();

  res.json({ ...updated, items });
});

router.put('/:id/status', authenticateToken, (req, res) => {
  const { status } = req.body;
  const taskId = parseInt(req.params.id, 10);

  const validStatuses = ['pending', 'accepted', 'in_progress', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

  if (!task) {
    db.close();
    return res.status(404).json({ error: 'Task not found' });
  }

  if (req.user.role === 'worker' && task.assigned_to !== req.user.id) {
    db.close();
    return res.status(403).json({ error: 'Not assigned to you' });
  }

  const timestamps = {};
  if (status === 'accepted') timestamps.accepted_at = new Date().toISOString();
  if (status === 'in_progress') timestamps.started_at = new Date().toISOString();
  if (status === 'completed') timestamps.completed_at = new Date().toISOString();

  let updateQuery = 'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP';
  const updateParams = [status];

  if (timestamps.accepted_at) {
    updateQuery += ', accepted_at = ?';
    updateParams.push(timestamps.accepted_at);
  }
  if (timestamps.started_at) {
    updateQuery += ', started_at = ?';
    updateParams.push(timestamps.started_at);
  }
  if (timestamps.completed_at) {
    updateQuery += ', completed_at = ?';
    updateParams.push(timestamps.completed_at);
  }

  updateQuery += ' WHERE id = ?';
  updateParams.push(taskId);

  db.prepare(updateQuery).run(...updateParams);

  db.prepare('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?')
    .run(req.user.id);

  db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)')
    .run(req.user.id, 'update_task_status', `Task ${taskId} status changed to: ${status}`);

  const updated = db.prepare(`
    SELECT t.*, u1.full_name as assigned_to_name, u2.full_name as assigned_by_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.assigned_by = u2.id
    WHERE t.id = ?
  `).get(taskId);
  const items = db.prepare('SELECT * FROM task_items WHERE task_id = ?').all(taskId);
  db.close();

  res.json({ ...updated, items });
});

router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const taskId = parseInt(req.params.id, 10);

  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

  if (!task) {
    db.close();
    return res.status(404).json({ error: 'Task not found' });
  }

  db.prepare('DELETE FROM task_items WHERE task_id = ?').run(taskId);
  db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)')
    .run(req.user.id, 'delete_task', `Deleted task: ${task.title}`);
  db.close();

  res.json({ message: 'Task deleted successfully' });
});

module.exports = router;
