const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();

  const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
  const pendingTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'").get().count;
  const inProgressTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status IN ('accepted', 'in_progress')").get().count;
  const completedTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'").get().count;

  const totalWorkers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'worker'").get().count;
  const onlineWorkers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'worker' AND status = 'online'").get().count;

  const tasksByShop = db.prepare(`
    SELECT shop, COUNT(*) as count, 
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM tasks WHERE shop IS NOT NULL GROUP BY shop
  `).all();

  const tasksByWorker = db.prepare(`
    SELECT u.full_name, u.shop, u.status as worker_status,
      COUNT(t.id) as total_tasks,
      SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) as pending_tasks
    FROM users u
    LEFT JOIN tasks t ON u.id = t.assigned_to
    WHERE u.role = 'worker'
    GROUP BY u.id
  `).all();

  const recentActivity = db.prepare(`
    SELECT al.*, u.full_name 
    FROM activity_log al
    LEFT JOIN users u ON al.user_id = u.id
    ORDER BY al.created_at DESC LIMIT 20
  `).all();

  const avgCompletionTime = db.prepare(`
    SELECT AVG(
      (julianday(completed_at) - julianday(created_at)) * 24 * 60
    ) as avg_minutes
    FROM tasks WHERE status = 'completed' AND completed_at IS NOT NULL
  `).get();

  db.close();

  res.json({
    overview: {
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      totalWorkers,
      onlineWorkers,
      avgCompletionMinutes: avgCompletionTime.avg_minutes ? Math.round(avgCompletionTime.avg_minutes) : 0,
    },
    tasksByShop,
    tasksByWorker,
    recentActivity,
  });
});

router.get('/shops', authenticateToken, (req, res) => {
  const db = getDb();
  const shops = db.prepare('SELECT * FROM shops ORDER BY name').all();
  db.close();
  res.json(shops);
});

router.get('/activity', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const { limit = 50 } = req.query;
  const activity = db.prepare(`
    SELECT al.*, u.full_name, u.username 
    FROM activity_log al
    LEFT JOIN users u ON al.user_id = u.id
    ORDER BY al.created_at DESC LIMIT ?
  `).all(parseInt(limit, 10));
  db.close();
  res.json(activity);
});

module.exports = router;
