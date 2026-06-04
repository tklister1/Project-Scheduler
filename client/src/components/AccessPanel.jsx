import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Trash2, UserPlus } from 'lucide-react';

export default function AccessPanel({ projectId, onRefresh }) {
  const [access, setAccess] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('viewer');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [aRes, uRes] = await Promise.all([
      api.get(`/projects/${projectId}/access`),
      api.get('/users'),
    ]);
    setAccess(aRes.data);
    setAllUsers(uRes.data);
  }

  useEffect(() => { load(); }, [projectId]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    await api.post(`/projects/${projectId}/access`, { user_id: userId, role });
    setUserId('');
    await load();
    onRefresh();
    setSaving(false);
  }

  async function handleRemove(uid) {
    await api.delete(`/projects/${projectId}/access/${uid}`);
    await load();
    onRefresh();
  }

  const existingUserIds = new Set(access.map((a) => a.user_id));
  const available = allUsers.filter((u) => !existingUserIds.has(u.id));

  return (
    <div className="space-y-6 max-w-xl">
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 font-medium text-sm text-gray-900">Current Access</div>
        {access.length === 0 ? (
          <div className="px-5 py-6 text-gray-400 text-sm">No users with explicit access.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {access.map((a) => (
              <li key={a.user_id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">{a.name}</div>
                  <div className="text-xs text-gray-400">{a.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${a.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {a.role}
                  </span>
                  <button onClick={() => handleRemove(a.user_id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-5">
        <h3 className="font-medium text-sm text-gray-900 mb-4">Add User</h3>
        <form onSubmit={handleAdd} className="flex gap-3">
          <select className="input flex-1" value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="">Select user…</option>
            {available.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
          <select className="input w-32" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="btn-primary" disabled={saving || !userId}>
            <UserPlus size={16} /> Add
          </button>
        </form>
        {available.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">All users already have access.</p>
        )}
      </div>
    </div>
  );
}
