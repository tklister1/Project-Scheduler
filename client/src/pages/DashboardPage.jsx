import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { PROJECT_STATUSES, MILESTONE_STATUSES, statusColor } from '../lib/constants';
import { FolderKanban, CheckCircle2, Clock, AlertCircle, Calendar, Flag, ChevronRight } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addDays, isToday, isPast } from 'date-fns';

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

function DateBadge({ date }) {
  const d = parseISO(date);
  const today = new Date();
  if (isToday(d)) return <span className="badge bg-yellow-100 text-yellow-700">Today</span>;
  if (isPast(d)) return <span className="badge bg-red-100 text-red-600">Overdue</span>;
  if (isBefore(d, addDays(today, 7))) return <span className="badge bg-orange-100 text-orange-700">This week</span>;
  if (isBefore(d, addDays(today, 30))) return <span className="badge bg-blue-100 text-blue-700">This month</span>;
  return null;
}

function typeLabel(type, phaseName) {
  if (type === 'phase_start') return `${phaseName} — Start`;
  if (type === 'phase_end') return `${phaseName} — End`;
  return null;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [keyDates, setKeyDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/projects'),
      api.get('/dashboard/key-dates'),
    ]).then(([pRes, dRes]) => {
      setProjects(pRes.data);
      setKeyDates(dRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const active = projects.filter((p) => p.status !== 'stabilized').length;
  const totalMilestones = projects.reduce((s, p) => s + (p.milestone_count || 0), 0);
  const completedMilestones = projects.reduce((s, p) => s + (p.completed_milestones || 0), 0);

  // Split upcoming vs past
  const today = new Date();
  const upcoming = keyDates.filter((d) => !isPast(parseISO(d.date)) || isToday(parseISO(d.date)));
  const past = keyDates.filter((d) => isPast(parseISO(d.date)) && !isToday(parseISO(d.date)));
  const displayDates = showAll ? keyDates : upcoming.slice(0, 10);

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
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Projects" value={projects.length} icon={FolderKanban} color="bg-brand-600" />
            <StatCard label="Active Projects" value={active} icon={Clock} color="bg-green-500" />
            <StatCard label="Total Key Dates" value={totalMilestones} icon={AlertCircle} color="bg-purple-500" />
            <StatCard label="Completed" value={completedMilestones} icon={CheckCircle2} color="bg-emerald-500" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Key Dates */}
            <div className="xl:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Key Dates</h2>
                {keyDates.length > 10 && (
                  <button onClick={() => setShowAll((s) => !s)} className="text-xs text-brand-600 hover:underline">
                    {showAll ? 'Show upcoming only' : `Show all (${keyDates.length})`}
                  </button>
                )}
              </div>

              {keyDates.length === 0 ? (
                <div className="card p-8 text-center text-gray-400">
                  <Calendar size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No key dates yet.</p>
                  <p className="text-xs mt-1">Add due dates to milestones or set phase date ranges.</p>
                </div>
              ) : (
                <div className="card divide-y divide-gray-100">
                  {displayDates.map((d, i) => {
                    const isPastDate = isPast(parseISO(d.date)) && !isToday(parseISO(d.date));
                    return (
                      <Link
                        key={`${d.type}-${d.id}-${i}`}
                        to={`/projects/${d.project_id}`}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${isPastDate ? 'opacity-50' : ''}`}
                      >
                        <div className="mt-0.5">
                          {d.type === 'milestone'
                            ? <Flag size={15} className="text-brand-500" />
                            : <Calendar size={15} className="text-purple-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{d.name}</div>
                          <div className="text-xs text-gray-400 truncate">
                            {d.project_name}
                            {d.type !== 'milestone' && (
                              <span className="ml-1 text-purple-500">
                                · {d.type === 'phase_start' ? 'Phase Start' : 'Phase End'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-medium text-gray-600">{format(parseISO(d.date), 'MMM d, yyyy')}</div>
                          <div className="mt-0.5"><DateBadge date={d.date} /></div>
                        </div>
                      </Link>
                    );
                  })}
                  {!showAll && upcoming.length === 0 && past.length > 0 && (
                    <div className="px-4 py-3 text-xs text-center text-gray-400">
                      All dates are in the past.{' '}
                      <button onClick={() => setShowAll(true)} className="text-brand-600 hover:underline">Show all</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Projects */}
            <div className="xl:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Projects</h2>
              <div className="grid gap-4 grid-cols-1">
                {projects.filter((p) => p.status !== 'stabilized').map((p) => {
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
                          <span>{p.completed_milestones}/{p.milestone_count} key dates</span>
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
                {projects.filter((p) => p.status !== 'stabilized').length === 0 && (
                  <div className="sm:col-span-2 text-center py-16 text-gray-400">
                    <FolderKanban size={40} className="mx-auto mb-3 opacity-40" />
                    <p>No active projects.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
