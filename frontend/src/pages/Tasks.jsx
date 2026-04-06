import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Tasks() {
  const { apiFetch } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filters, setFilters] = useState({ status: '', shop: '', assigned_to: '', search: '' });

  const [form, setForm] = useState({
    title: '', description: '', assigned_to: '', shop: '', priority: 'normal',
    items: [{ item_name: '', quantity: 1 }],
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  async function loadData() {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => { if (val) params.set(key, val); });

      const [tasksRes, workersRes, shopsRes] = await Promise.all([
        apiFetch(`/tasks?${params}`),
        apiFetch('/users'),
        apiFetch('/analytics/shops'),
      ]);

      setTasks(await tasksRes.json());
      const allUsers = await workersRes.json();
      setWorkers(allUsers.filter((u) => u.role === 'worker'));
      setShops(await shopsRes.json());
    } catch {
      // Will retry
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditTask(null);
    setForm({
      title: '', description: '', assigned_to: '', shop: '', priority: 'normal',
      items: [{ item_name: '', quantity: 1 }],
    });
    setShowModal(true);
  }

  function openEdit(task) {
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      shop: task.shop || '',
      priority: task.priority,
      items: task.items?.length ? task.items.map((i) => ({ item_name: i.item_name, quantity: i.quantity })) : [{ item_name: '', quantity: 1 }],
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const body = {
      ...form,
      assigned_to: form.assigned_to ? parseInt(form.assigned_to, 10) : null,
      items: form.items.filter((i) => i.item_name.trim()),
    };

    try {
      if (editTask) {
        await apiFetch(`/tasks/${editTask.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch('/tasks', { method: 'POST', body: JSON.stringify(body) });
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert('Failed to save task');
    }
  }

  async function deleteTask(id) {
    if (!confirm('Delete this task?')) return;
    await apiFetch(`/tasks/${id}`, { method: 'DELETE' });
    loadData();
  }

  function addItem() {
    setForm({ ...form, items: [...form.items, { item_name: '', quantity: 1 }] });
  }

  function updateItem(idx, field, value) {
    const items = [...form.items];
    items[idx][field] = field === 'quantity' ? parseInt(value, 10) || 0 : value;
    setForm({ ...form, items });
  }

  function removeItem(idx) {
    const items = form.items.filter((_, i) => i !== idx);
    setForm({ ...form, items: items.length ? items : [{ item_name: '', quantity: 1 }] });
  }

  if (loading) return <div className="loading">Loading tasks...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Task Management</h1>
        <button className="btn btn-primary" onClick={openCreate}>➕ New Task</button>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="🔍 Search tasks..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select value={filters.shop} onChange={(e) => setFilters({ ...filters, shop: e.target.value })}>
          <option value="">All Shops</option>
          {shops.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <select value={filters.assigned_to} onChange={(e) => setFilters({ ...filters, assigned_to: e.target.value })}>
          <option value="">All Workers</option>
          {workers.map((w) => <option key={w.id} value={w.id}>{w.full_name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Assigned To</th>
                <th>Shop</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Items</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state">
                      <div className="icon">📋</div>
                      <p>No tasks found. Create your first task!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <strong>{task.title}</strong>
                      {task.description && <div style={{ fontSize: 12, color: '#6c757d', marginTop: 2 }}>{task.description}</div>}
                    </td>
                    <td>{task.assigned_to_name || '—'}</td>
                    <td>{task.shop || '—'}</td>
                    <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                    <td><span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span></td>
                    <td>{task.items?.length || 0}</td>
                    <td style={{ fontSize: 12 }}>{new Date(task.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(task)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteTask(task.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editTask ? '✏️ Edit Task' : '➕ Create Task'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows="2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Assign To</label>
                  <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
                    <option value="">Unassigned</option>
                    {workers.map((w) => <option key={w.id} value={w.id}>{w.full_name} ({w.shop})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Shop</label>
                  <select value={form.shop} onChange={(e) => setForm({ ...form, shop: e.target.value })}>
                    <option value="">Select Shop</option>
                    {shops.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="form-group">
                <label>Items (Medicine List)</label>
                {form.items.map((item, idx) => (
                  <div key={idx} className="item-row">
                    <input
                      type="text"
                      placeholder="Item name"
                      value={item.item_name}
                      onChange={(e) => updateItem(idx, 'item_name', e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      min="0"
                    />
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItem(idx)}>✕</button>
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm" onClick={addItem} style={{ marginTop: 4 }}>
                  + Add Item
                </button>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editTask ? 'Update Task' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
