# Prabhat Medical — Shop Management & Task Assignment System

A fully functional, production-ready **offline-first** shop management and task assignment system for **Prabhat Medical**. Designed for LAN-based operation with zero cloud dependency.

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Local Wi-Fi Network                 │
│                                                       │
│  ┌─────────────────┐     ┌────────────────────────┐  │
│  │  Admin Dashboard │────▶│   Backend Server        │  │
│  │  (Web Browser)   │◀────│   (Node.js + Express)   │  │
│  └─────────────────┘     │   Port 3000              │  │
│                           │   SQLite Database         │  │
│  ┌─────────────────┐     │   WebSocket Server        │  │
│  │  Worker App      │────▶│                          │  │
│  │  (Android APK)   │◀────│                          │  │
│  └─────────────────┘     └────────────────────────┘  │
│                                                       │
│  ┌─────────────────┐                                  │
│  │  Worker App 2    │──────────────▶ (same server)    │
│  │  (Android APK)   │                                 │
│  └─────────────────┘                                  │
└──────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
prabhat-/
├── backend/          # Node.js Express API server
│   ├── src/
│   │   ├── db/           # Database initialization & seed
│   │   ├── middleware/   # JWT authentication
│   │   ├── routes/       # REST API endpoints
│   │   └── server.js     # Main server entry
│   ├── public/           # Built frontend (served by backend)
│   └── package.json
├── frontend/         # React admin dashboard
│   ├── src/
│   │   ├── components/   # Layout components
│   │   ├── context/      # Auth context
│   │   ├── pages/        # Dashboard, Tasks, Workers, Activity
│   │   └── styles.css    # Complete styling
│   ├── vite.config.js
│   └── package.json
├── mobile/           # React Native/Expo worker app
│   ├── src/
│   │   ├── screens/      # Login, Tasks, TaskDetail, Settings
│   │   ├── context/      # Auth context
│   │   └── App.js        # Main app entry
│   ├── app.json
│   └── package.json
└── docs/             # Documentation
```

## 🚀 Quick Start Setup

### Prerequisites

- **Node.js** v18+ installed on the server machine
- **npm** (comes with Node.js)
- A **local Wi-Fi network** connecting all devices
- **Android device(s)** for worker app (optional for testing)

### Step 1: Install & Start Backend

```bash
cd backend
npm install
npm start
```

The server starts on `http://0.0.0.0:3000` and is accessible from any device on the LAN.

### Step 2: Build Frontend (if modifying)

The frontend is pre-built into `backend/public/`. To rebuild after changes:

```bash
cd frontend
npm install
npm run build
```

### Step 3: Access Admin Dashboard

Open a browser on any device on the network and navigate to:
- Local: `http://localhost:3000`
- Network: `http://<server-ip>:3000`

### Step 4: Setup Worker Mobile App

1. Install Expo Go on worker Android devices, OR build the APK
2. Update server URL in the app settings to match your server's LAN IP
3. Login with worker credentials

## 🔐 Default Test Users

| Username | Password | Role | Shop |
|----------|----------|------|------|
| admin | admin123 | Admin | — |
| rajesh | worker123 | Worker | Shop 1 |
| sunita | worker123 | Worker | Shop 1 |
| amit | worker123 | Worker | Shop 2 |
| priya | worker123 | Worker | Shop 2 |

⚠️ **Change these passwords after first login in production!**

## 📊 Admin Dashboard Features

- **Dashboard**: Real-time overview of tasks, workers, performance metrics
- **Task Management**: Create, assign, edit, delete, filter tasks
- **Worker Management**: Add/edit/delete workers, reset passwords
- **Activity Log**: Full audit trail of all actions
- **Real-time Updates**: WebSocket connection for live status
- **Responsive Design**: Works on desktop and tablet browsers

## 📱 Worker Mobile App Features

- **Secure Login**: JWT-based authentication
- **Task List**: View assigned tasks with filter (Active/Completed/All)
- **Task Actions**: Accept → Start → Complete workflow
- **Task Details**: Full task info with items list and timeline
- **Server Settings**: Configurable server URL for LAN connectivity
- **Auto-refresh**: Tasks update every 10 seconds
- **Pull-to-refresh**: Manual refresh support

## 🛠️ API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with username/password |
| POST | `/api/auth/logout` | Logout current session |

### Users (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user details |
| POST | `/api/users` | Create new user |
| PUT | `/api/users/:id` | Update user |
| PUT | `/api/users/:id/password` | Reset user password |
| DELETE | `/api/users/:id` | Delete user |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (filtered by role) |
| GET | `/api/tasks/:id` | Get task details with items |
| POST | `/api/tasks` | Create new task (admin) |
| PUT | `/api/tasks/:id` | Update task (admin) |
| PUT | `/api/tasks/:id/status` | Update task status (worker/admin) |
| DELETE | `/api/tasks/:id` | Delete task (admin) |

**Query Parameters for GET /api/tasks:**
- `status` — Filter by status (pending, accepted, in_progress, completed)
- `shop` — Filter by shop name
- `assigned_to` — Filter by worker ID
- `date_from` / `date_to` — Date range filter
- `search` — Search in title and description

### Analytics (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Dashboard overview data |
| GET | `/api/analytics/shops` | List all shops |
| GET | `/api/analytics/activity` | Activity log |

### WebSocket

Connect to `ws://<server>:3000/ws?token=<jwt>` for real-time updates.

**Message Types:**
- `connected` — Connection confirmed
- `task_update` — Task was updated
- `worker_status` — Worker online/offline status change
- `heartbeat` / `heartbeat_ack` — Keep-alive

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health status |

## 🗄️ Database Schema

### users
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| username | TEXT UNIQUE | Login username |
| password | TEXT | Bcrypt hashed password |
| full_name | TEXT | Display name |
| role | TEXT | 'admin' or 'worker' |
| shop | TEXT | Assigned shop name |
| status | TEXT | 'online', 'offline', 'idle' |
| last_active | DATETIME | Last activity timestamp |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

### tasks
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| title | TEXT | Task title |
| description | TEXT | Task description |
| assigned_to | INTEGER FK | Worker user ID |
| assigned_by | INTEGER FK | Admin user ID |
| shop | TEXT | Target shop |
| status | TEXT | pending/accepted/in_progress/completed |
| priority | TEXT | low/normal/high/urgent |
| created_at | DATETIME | Creation timestamp |
| accepted_at | DATETIME | When worker accepted |
| started_at | DATETIME | When work started |
| completed_at | DATETIME | When completed |
| updated_at | DATETIME | Last update |

### task_items
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| task_id | INTEGER FK | Parent task |
| item_name | TEXT | Medicine/item name |
| quantity | INTEGER | Quantity needed |
| is_done | INTEGER | Completion flag |

### shops
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| name | TEXT UNIQUE | Shop name |
| address | TEXT | Shop address |
| created_at | DATETIME | Creation timestamp |

### activity_log
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| user_id | INTEGER FK | Acting user |
| action | TEXT | Action type |
| details | TEXT | Action details |
| created_at | DATETIME | Timestamp |

## 🏭 Production Deployment

### Windows Setup

1. Install Node.js from https://nodejs.org
2. Open Command Prompt/PowerShell
3. Navigate to the project folder
4. Run:
```bash
cd backend
npm install
npm start
```
5. Find your PC's IP address: `ipconfig` → look for IPv4 Address
6. Workers connect to `http://<your-ip>:3000`

### Linux Setup

```bash
cd backend
npm install
npm start
```

Find your IP: `hostname -I` or `ip addr`

### Auto-start on Boot (Windows)

Create a batch file `start-prabhat.bat`:
```batch
@echo off
cd /d "C:\path\to\prabhat-\backend"
node src/server.js
```
Add it to Windows Startup folder.

### Auto-start on Boot (Linux)

Create a systemd service `/etc/systemd/system/prabhat.service`:
```ini
[Unit]
Description=Prabhat Medical Server

[Service]
WorkingDirectory=/path/to/prabhat-/backend
ExecStart=/usr/bin/node src/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable prabhat
sudo systemctl start prabhat
```

## 📱 Building APK

### Using Expo

```bash
cd mobile
npx expo install
npx eas build -p android --profile preview
```

### Using Expo Go (for testing)

1. Install "Expo Go" from Play Store on worker's phone
2. Run `npx expo start` from the mobile directory
3. Scan QR code with Expo Go

## 🔒 Security Notes

- All passwords are hashed with bcrypt (10 rounds)
- JWT tokens expire after 24 hours
- No data leaves the local network
- Change default passwords before production use
- Consider enabling HTTPS with a self-signed certificate for added security

## 📋 Technical Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js + Express 5 |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Real-time | WebSocket (ws) |
| Frontend | React 19 + Vite |
| Mobile | React Native + Expo |
| Navigation | React Router (web) / React Navigation (mobile) |

## 🐛 Troubleshooting

### Server won't start
- Check if port 3000 is available: `netstat -an | grep 3000`
- Try a different port: edit `.env` file

### Can't connect from other devices
- Ensure all devices are on the same Wi-Fi network
- Check firewall settings — allow port 3000
- Use the server's LAN IP address (not localhost)

### Worker app can't connect
- Update server URL in app Settings screen
- Verify the server is running
- Check that the phone is on the same Wi-Fi network