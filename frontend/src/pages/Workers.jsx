import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Workers() {
  const { apiFetch } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editWorker, setEditWorker] = useState(null);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const [form, setForm] = useState({
    username: '', password: '', full_name: '', role: 'worker', shop: '',
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [usersRes, shopsRes] = await Promise.all([
        apiFetch('/users'),
        apiFetch('/analytics/shops'),
      ]);
      setWorkers(await usersRes.json());
      setShops(await shopsRes.json());
    } catch {
      // Will retry
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditWorker(null);
    setForm({ username: '', password: '', full_name: '', role: 'worker', shop: '' });
    setShowModal(true);
  }

  function openEdit(worker) {
    setEditWorker(worker);
    setForm({
      username: worker.username,
      password: '',
      full_name: worker.full_name,
      role: worker.role,
      shop: worker.shop || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editWorker) {
        await apiFetch(`/users/${editWorker.id}`, {
          method: 'PUT',
          body: JSON.stringify({ full_name: form.full_name, role: form.role, shop: form.shop }),
        });
      } else {
        await apiFetch('/users', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setShowModal(false);
      loadData();
    } catch {
      alert('Failed to save user');
    }
  }

  async function deleteWorker(id) {
    if (!confirm('Delete this user? Their tasks will become unassigned.')) return;
    await apiFetch(`/users/${id}`, { method: 'DELETE' });
    loadData();
  }

  async function resetPassword(e) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      alert('Password must be at least 4 characters');
      return;
    }
    await apiFetch(`/users/${passwordTarget.id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password: newPassword }),
    });
    setShowPasswordModal(false);
    setNewPassword('');
    alert('Password updated successfully');
  }

  if (loading) return <div className="loading">Loading workers...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Worker Management</h1>
        <button className="btn btn-primary" onClick={openCreate}>➕ Add User</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Shop</th>
                <th>Status</th>
                <th>Last Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w.id}>
                  <td><strong>{w.full_name}</strong></td>
                  <td>{w.username}</td>
                  <td><span className={`badge ${w.role === 'admin' ? 'badge-urgent' : 'badge-normal'}`}>{w.role}</span></td>
                  <td>{w.shop || '—'}</td>
                  <td><span className={`badge badge-${w.status}`}>{w.status}</span></td>
                  <td style={{ fontSize: 12 }}>{w.last_active ? new Date(w.last_active).toLocaleString() : 'Never'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(w)}>✏️</button>
                      <button className="btn btn-warning btn-sm" onClick={() => { setPasswordTarget(w); setShowPasswordModal(true); setNewPassword(''); }}>🔑</button>
                      {w.role !== 'admin' && (
                        <button className="btn btn-danger btn-sm" onClick={() => deleteWorker(w.id)}>🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editWorker ? '✏️ Edit User' : '➕ Add User'}</h2>
            <form onSubmit={handleSubmit}>
              {!editWorker && (
                <>
                  <div className="form-group">
                    <label>Username *</label>
                    <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Password *</label>
                    <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={4} />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="worker">Worker</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>Shop</label>
                <select value={form.shop} onChange={(e) => setForm({ ...form, shop: e.target.value })}>
                  <option value="">No Shop</option>
                  {shops.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editWorker ? 'Update' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>🔑 Reset Password</h2>
            <p style={{ marginBottom: 16, color: '#6c757d' }}>
              Reset password for <strong>{passwordTarget?.full_name}</strong>
            </p>
            <form onSubmit={resetPassword}>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={4} placeholder="Minimum 4 characters" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
