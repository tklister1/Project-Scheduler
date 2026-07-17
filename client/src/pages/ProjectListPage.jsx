import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { PROJECT_STATUSES, statusColor } from '../lib/constants';
import { Plus, Search, FolderKanban, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ProjectModal from '../components/ProjectModal';

export default function ProjectListPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  function load() {
    api.get('/projects').then((r) => setProjects(r.data)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this project and all its key tasks?')) return;
    await api.delete(`/projects/${id}`);
    load();
  }

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">{projects.length} total</p>
        </div>
        {user?.is_global_admin && (
          <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Project</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Key Tasks</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Start</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">End</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => {
                const pct = p.milestone_count > 0 ? Math.round((p.completed_milestones / p.milestone_count) * 100) : 0;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/projects/${p.id}`} className="font-medium text-brand-600 hover:underline">{p.name}</Link>
                      {p.description && <p className="text-gray-400 text-xs mt-0.5 truncate max-w-xs">{p.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusColor(PROJECT_STATUSES, p.status)}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-gray-500">{p.completed_milestones}/{p.milestone_count}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.start_date ? format(parseISO(p.start_date), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.end_date ? format(parseISO(p.end_date), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {user?.is_global_admin && (
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => { setEditing(p); setShowModal(true); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-brand-600">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <FolderKanban size={32} className="mx-auto mb-2 opacity-40" />
                    No projects match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ProjectModal
          project={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
