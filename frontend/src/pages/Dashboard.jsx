import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadDashboard() {
    try {
      const res = await apiFetch('/analytics/dashboard');
      const json = await res.json();
      setData(json);
    } catch {
      // Retry on next interval
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!data) return <div className="error-msg">Failed to load dashboard data</div>;

  const { overview, tasksByShop, tasksByWorker, recentActivity } = data;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <span style={{ color: '#6c757d', fontSize: 14 }}>
          Auto-refreshes every 15 seconds
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📋</div>
          <div className="stat-info">
            <h3>{overview.totalTasks}</h3>
            <p>Total Tasks</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">⏳</div>
          <div className="stat-info">
            <h3>{overview.pendingTasks}</h3>
            <p>Pending</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">🔄</div>
          <div className="stat-info">
            <h3>{overview.inProgressTasks}</h3>
            <p>In Progress</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-info">
            <h3>{overview.completedTasks}</h3>
            <p>Completed</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal">👥</div>
          <div className="stat-info">
            <h3>{overview.onlineWorkers}/{overview.totalWorkers}</h3>
            <p>Workers Online</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">⏱️</div>
          <div className="stat-info">
            <h3>{overview.avgCompletionMinutes}m</h3>
            <p>Avg Completion</p>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h2>📊 Tasks by Shop</h2>
          </div>
          <div className="card-body">
            {tasksByShop.length === 0 ? (
              <p style={{ color: '#6c757d' }}>No shop data yet</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Shop</th>
                    <th>Total</th>
                    <th>Completed</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {tasksByShop.map((s) => (
                    <tr key={s.shop}>
                      <td><strong>{s.shop}</strong></td>
                      <td>{s.count}</td>
                      <td>{s.completed}</td>
                      <td>
                        <span className="badge badge-completed">
                          {s.count > 0 ? Math.round((s.completed / s.count) * 100) : 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>👥 Worker Performance</h2>
          </div>
          <div className="card-body">
            {tasksByWorker.length === 0 ? (
              <p style={{ color: '#6c757d' }}>No worker data yet</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Shop</th>
                    <th>Status</th>
                    <th>Done</th>
                  </tr>
                </thead>
                <tbody>
                  {tasksByWorker.map((w) => (
                    <tr key={w.full_name}>
                      <td><strong>{w.full_name}</strong></td>
                      <td>{w.shop || '—'}</td>
                      <td><span className={`badge badge-${w.worker_status}`}>{w.worker_status}</span></td>
                      <td>{w.completed_tasks}/{w.total_tasks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>📝 Recent Activity</h2>
        </div>
        <div className="card-body">
          {recentActivity.length === 0 ? (
            <p style={{ color: '#6c757d' }}>No activity yet</p>
          ) : (
            <ul className="activity-list">
              {recentActivity.slice(0, 10).map((a) => (
                <li key={a.id}>
                  <span>
                    <strong>{a.full_name || 'System'}</strong> — {a.details || a.action}
                  </span>
                  <span className="activity-time">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
