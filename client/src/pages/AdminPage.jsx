import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tab, setTab] = useState('users');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  async function load() {
    const [uRes, pRes] = await Promise.all([api.get('/users'), api.get('/projects')]);
    setUsers(uRes.data);
    setProjects(pRes.data);
  }

  useEffect(() => { load(); }, []);

  async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    await api.delete(`/users/${id}`);
    load();
  }

  async function deleteProject(id) {
    if (!confirm('Delete this project and all key tasks?')) return;
    await api.delete(`/projects/${id}`);
    load();
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500 text-sm mt-1">Manage users and projects</p>
      </div>

      <div className="border-b border-gray-200 mb-6 flex gap-0">
        {['users', 'projects'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium border-b-2 capitalize transition-colors ${
              tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setEditingUser(null); setShowUserModal(true); }} className="btn-primary">
              <Plus size={16} /> New User
            </button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.is_global_admin
                        ? <span className="badge bg-purple-100 text-purple-700 inline-flex items-center gap-1"><Shield size={11} />Admin</span>
                        : <span className="badge bg-gray-100 text-gray-600">User</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-500">{format(parseISO(u.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => { setEditingUser(u); setShowUserModal(true); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-brand-600">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteUser(u.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'projects' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Project</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Key Tasks</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created By</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    {p.description && <div className="text-xs text-gray-400 truncate max-w-xs">{p.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-gray-100 text-gray-600 capitalize">{p.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.completed_milestones}/{p.milestone_count}</td>
                  <td className="px-4 py-3 text-gray-500">{p.created_by_name || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteProject(p.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUserModal && (
        <UserModal
          user={editingUser}
          onClose={() => setShowUserModal(false)}
          onSaved={() => { setShowUserModal(false); load(); }}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    is_global_admin: user?.is_global_admin ? true : false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (user) {
        const payload = { name: form.name, email: form.email, is_global_admin: form.is_global_admin };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${user.id}`, payload);
      } else {
        await api.post('/users', form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{user ? 'Edit User' : 'New User'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{user ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <input type="password" className="input" value={form.password} onChange={(e) => set('password', e.target.value)} required={!user} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="admin" checked={form.is_global_admin} onChange={(e) => set('is_global_admin', e.target.checked)} className="rounded" />
            <label htmlFor="admin" className="text-sm text-gray-700">Global Administrator</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
              {saving ? 'Saving…' : user ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
