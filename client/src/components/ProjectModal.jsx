import { useState } from 'react';
import api from '../lib/api';
import { PROJECT_STATUSES } from '../lib/constants';
import { X } from 'lucide-react';

export default function ProjectModal({ project, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'in_progress',
    start_date: project?.start_date || '',
    end_date: project?.end_date || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (project) {
        await api.put(`/projects/${project.id}`, form);
      } else {
        await api.post('/projects', form);
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{project ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input resize-none" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" className="input" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
              {saving ? 'Saving…' : project ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
