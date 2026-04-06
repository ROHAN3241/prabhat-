const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || './data/prabhat.db';

function getDb() {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function initializeDatabase() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'worker')),
      shop TEXT,
      status TEXT NOT NULL DEFAULT 'offline' CHECK(status IN ('online', 'offline', 'idle')),
      last_active DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      assigned_to INTEGER,
      assigned_by INTEGER NOT NULL,
      shop TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'in_progress', 'completed')),
      priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      accepted_at DATETIME,
      started_at DATETIME,
      completed_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (assigned_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS task_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      is_done INTEGER DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_shop ON tasks(shop);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
  `);

  return db;
}

function seedDatabase(db) {
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (existingAdmin) return;

  const adminPassword = bcrypt.hashSync('admin123', 10);
  const workerPassword = bcrypt.hashSync('worker123', 10);

  const insertUser = db.prepare(
    'INSERT INTO users (username, password, full_name, role, shop) VALUES (?, ?, ?, ?, ?)'
  );

  const insertShop = db.prepare(
    'INSERT INTO shops (name, address) VALUES (?, ?)'
  );

  const insertTask = db.prepare(
    'INSERT INTO tasks (title, description, assigned_to, assigned_by, shop, status, priority) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const insertTaskItem = db.prepare(
    'INSERT INTO task_items (task_id, item_name, quantity) VALUES (?, ?, ?)'
  );

  const transaction = db.transaction(() => {
    insertShop.run('Shop 1', 'Main Street, Ground Floor');
    insertShop.run('Shop 2', 'Market Road, First Floor');

    insertUser.run('admin', adminPassword, 'Prabhat Admin', 'admin', null);
    insertUser.run('rajesh', workerPassword, 'Rajesh Kumar', 'worker', 'Shop 1');
    insertUser.run('sunita', workerPassword, 'Sunita Devi', 'worker', 'Shop 1');
    insertUser.run('amit', workerPassword, 'Amit Singh', 'worker', 'Shop 2');
    insertUser.run('priya', workerPassword, 'Priya Sharma', 'worker', 'Shop 2');

    const task1 = insertTask.run(
      'Restock Pain Relievers',
      'Restock the pain reliever shelf in Shop 1',
      2, 1, 'Shop 1', 'pending', 'high'
    );
    insertTaskItem.run(task1.lastInsertRowid, 'Paracetamol 500mg', 50);
    insertTaskItem.run(task1.lastInsertRowid, 'Ibuprofen 400mg', 30);
    insertTaskItem.run(task1.lastInsertRowid, 'Aspirin 300mg', 20);

    const task2 = insertTask.run(
      'Inventory Check - Antibiotics',
      'Count all antibiotic stock in Shop 2',
      4, 1, 'Shop 2', 'pending', 'normal'
    );
    insertTaskItem.run(task2.lastInsertRowid, 'Amoxicillin 250mg', 0);
    insertTaskItem.run(task2.lastInsertRowid, 'Azithromycin 500mg', 0);

    const task3 = insertTask.run(
      'Clean Display Counter',
      'Clean and organize the front display counter',
      3, 1, 'Shop 1', 'pending', 'low'
    );
    insertTaskItem.run(task3.lastInsertRowid, 'Wipe display glass', 1);
    insertTaskItem.run(task3.lastInsertRowid, 'Arrange medicine boxes', 1);
  });

  transaction();
  console.log('Database seeded with sample data');
}

module.exports = { getDb, initializeDatabase, seedDatabase };
