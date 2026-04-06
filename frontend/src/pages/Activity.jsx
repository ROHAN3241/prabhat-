import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Activity() {
  const { apiFetch } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, []);

  async function loadActivity() {
    try {
      const res = await apiFetch('/analytics/activity?limit=100');
      setActivities(await res.json());
    } catch {
      // Will retry
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading activity...</div>;

  const actionIcons = {
    login: '🔐',
    logout: '🚪',
    create_task: '📋',
    update_task: '✏️',
    update_task_status: '🔄',
    delete_task: '🗑️',
    create_user: '👤',
    update_user: '✏️',
    delete_user: '🗑️',
    reset_password: '🔑',
  };

  return (
    <div>
      <div className="page-header">
        <h1>Activity Log</h1>
        <button className="btn btn-outline" onClick={loadActivity}>🔄 Refresh</button>
      </div>

      <div className="card">
        <div className="card-body">
          {activities.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📝</div>
              <p>No activity recorded yet</p>
            </div>
          ) : (
            <ul className="activity-list">
              {activities.map((a) => (
                <li key={a.id}>
                  <span>
                    {actionIcons[a.action] || '📌'}{' '}
                    <strong>{a.full_name || a.username || 'System'}</strong>{' '}
                    — {a.details || a.action}
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
