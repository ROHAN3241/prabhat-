import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, token, logout } = useAuth();
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;

    function connect() {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
    }

    connect();

    const heartbeat = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      if (wsRef.current) wsRef.current.close();
    };
  }, [token]);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>💊 Prabhat Medical</h2>
          <p>Shop Management System</p>
        </div>
        <ul className="sidebar-nav">
          <li>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              📊 Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : ''}>
              📋 Tasks
            </NavLink>
          </li>
          <li>
            <NavLink to="/workers" className={({ isActive }) => isActive ? 'active' : ''}>
              👥 Workers
            </NavLink>
          </li>
          <li>
            <NavLink to="/activity" className={({ isActive }) => isActive ? 'active' : ''}>
              📝 Activity Log
            </NavLink>
          </li>
        </ul>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">{user?.full_name?.[0] || 'A'}</div>
            <div>
              <div style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>{user?.full_name}</div>
              <div style={{ fontSize: 12 }}>Administrator</div>
            </div>
          </div>
          <div className="ws-indicator">
            <span className={`ws-dot ${wsConnected ? 'connected' : 'disconnected'}`}></span>
            {wsConnected ? 'Connected' : 'Reconnecting...'}
          </div>
          <button className="btn btn-outline btn-sm btn-block" style={{ marginTop: 12 }} onClick={logout}>
            🚪 Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
