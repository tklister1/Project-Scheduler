import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { PROJECT_STATUSES, MILESTONE_STATUSES, statusColor } from '../lib/constants';
import { FolderKanban, CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data)).finally(() => setLoading(false));
  }, []);

  const active = projects.filter((p) => p.status === 'active').length;
  const totalMilestones = projects.reduce((s, p) => s + (p.milestone_count || 0), 0);
  const completedMilestones = projects.reduce((s, p) => s + (p.completed_milestones || 0), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of all your real estate projects</p>
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Projects" value={projects.length} icon={FolderKanban} color="bg-brand-600" />
            <StatCard label="Active Projects" value={active} icon={Clock} color="bg-green-500" />
            <StatCard label="Total Milestones" value={totalMilestones} icon={AlertCircle} color="bg-purple-500" />
            <StatCard label="Completed" value={completedMilestones} icon={CheckCircle2} color="bg-emerald-500" />
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-4">Projects</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => {
              const pct = p.milestone_count > 0 ? Math.round((p.completed_milestones / p.milestone_count) * 100) : 0;
              const statusCls = statusColor(PROJECT_STATUSES, p.status);
              return (
                <Link key={p.id} to={`/projects/${p.id}`} className="card p-5 hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors leading-tight">{p.name}</h3>
                    <span className={`badge ml-2 shrink-0 ${statusCls}`}>{p.status.replace('_', ' ')}</span>
                  </div>
                  {p.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{p.description}</p>}
                  <div className="mt-auto">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>{completedMilestones}/{p.milestone_count} milestones</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    {(p.start_date || p.end_date) && (
                      <div className="flex gap-3 mt-3 text-xs text-gray-400">
                        {p.start_date && <span>Start: {format(parseISO(p.start_date), 'MMM d, yyyy')}</span>}
                        {p.end_date && <span>End: {format(parseISO(p.end_date), 'MMM d, yyyy')}</span>}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {projects.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <FolderKanban size={40} className="mx-auto mb-3 opacity-40" />
              <p>No projects yet.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
