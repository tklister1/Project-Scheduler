import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { PROJECT_STATUSES, MILESTONE_STATUSES, PHASE_ORDER, phaseColor, statusColor } from '../lib/constants';
import { ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import MilestoneModal from '../components/MilestoneModal';
import GanttChart from '../components/GanttChart';
import AccessPanel from '../components/AccessPanel';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('milestones');
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);

  async function load() {
    const [pRes, mRes, phRes] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/milestones`),
      api.get(`/projects/${id}/phases`),
    ]);
    setProject(pRes.data);
    setMilestones(mRes.data);
    setPhases(phRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function deleteMilestone(mid) {
    if (!confirm('Delete this key task?')) return;
    await api.delete(`/projects/${id}/milestones/${mid}`);
    load();
  }

  async function updatePhase(phaseId, start_date, end_date) {
    await api.put(`/projects/${id}/phases/${phaseId}`, { start_date, end_date });
    load();
  }

  const canEdit = user?.is_global_admin || project?.access?.find((a) => a.user_id === user?.id && a.role === 'admin');

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (!project) return <div className="p-8 text-gray-500">Project not found.</div>;

  const tabs = [
    { key: 'milestones', label: 'Key Tasks' },
    { key: 'gantt', label: 'Gantt Chart' },
    ...(canEdit ? [{ key: 'access', label: 'Access' }] : []),
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600 mb-3">
          <ArrowLeft size={15} /> Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && <p className="text-gray-500 text-sm mt-1">{project.description}</p>}
            <div className="flex items-center gap-3 mt-2">
              <span className={`badge ${statusColor(PROJECT_STATUSES, project.status)}`}>{project.status.replace('_', ' ')}</span>
              {project.start_date && <span className="text-xs text-gray-400">Start: {format(parseISO(project.start_date), 'MMM d, yyyy')}</span>}
              {project.end_date && <span className="text-xs text-gray-400">End: {format(parseISO(project.end_date), 'MMM d, yyyy')}</span>}
            </div>
          </div>
          {canEdit && (
            <button onClick={() => { setEditingMilestone(null); setShowMilestoneModal(true); }} className="btn-primary">
              <Plus size={16} /> Add Key Task
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6 flex">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'milestones' && (
        <MilestoneList
          milestones={milestones}
          phases={phases}
          canEdit={canEdit}
          onEdit={(m) => { setEditingMilestone(m); setShowMilestoneModal(true); }}
          onDelete={deleteMilestone}
          onUpdatePhase={updatePhase}
        />
      )}

      {tab === 'gantt' && <GanttChart milestones={milestones} phases={phases} project={project} />}

      {tab === 'access' && canEdit && <AccessPanel projectId={id} onRefresh={load} />}

      {showMilestoneModal && (
        <MilestoneModal
          projectId={id}
          milestone={editingMilestone}
          onClose={() => setShowMilestoneModal(false)}
          onSaved={() => { setShowMilestoneModal(false); load(); }}
        />
      )}
    </div>
  );
}

function PhaseDateEditor({ phase, canEdit, onSave }) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(phase.start_date || '');
  const [end, setEnd] = useState(phase.end_date || '');

  function handleSave() {
    onSave(phase.id, start, end);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Calendar size={12} />
        {phase.start_date || phase.end_date ? (
          <span>
            {phase.start_date ? format(parseISO(phase.start_date), 'MMM d, yyyy') : '?'}
            {' → '}
            {phase.end_date ? format(parseISO(phase.end_date), 'MMM d, yyyy') : '?'}
          </span>
        ) : (
          <span>No dates set</span>
        )}
        {canEdit && (
          <button onClick={() => setEditing(true)} className="ml-1 text-gray-400 hover:text-brand-600">
            <Pencil size={11} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <input type="date" className="input py-0.5 px-2 text-xs w-36" value={start} onChange={(e) => setStart(e.target.value)} />
      <span className="text-gray-400 text-xs">→</span>
      <input type="date" className="input py-0.5 px-2 text-xs w-36" value={end} onChange={(e) => setEnd(e.target.value)} />
      <button onClick={handleSave} className="btn-primary py-0.5 px-2 text-xs">Save</button>
      <button onClick={() => setEditing(false)} className="btn-secondary py-0.5 px-2 text-xs">Cancel</button>
    </div>
  );
}

function MilestoneList({ milestones, phases, canEdit, onEdit, onDelete, onUpdatePhase }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [collapsed, setCollapsed] = useState({});

  function togglePhase(phase) {
    setCollapsed((c) => ({ ...c, [phase]: !c[phase] }));
  }

  const filtered = statusFilter ? milestones.filter((m) => m.status === statusFilter) : milestones;

  // Build phase map by name for date lookup
  const phaseByName = Object.fromEntries(phases.map((p) => [p.name, p]));

  const phaseGroups = PHASE_ORDER
    .map((phase) => ({ phase, items: filtered.filter((m) => m.category === phase) }))
    .filter((g) => g.items.length > 0);

  const knownPhases = new Set(PHASE_ORDER);
  const otherItems = filtered.filter((m) => !knownPhases.has(m.category));
  if (otherItems.length > 0) phaseGroups.push({ phase: 'Other', items: otherItems });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select className="input w-auto text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {MILESTONE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {phaseGroups.length === 0 && (
        <div className="card p-10 text-center text-gray-400">No key tasks found.</div>
      )}

      {phaseGroups.map(({ phase, items }) => {
        const isCollapsed = collapsed[phase];
        const completedCount = items.filter((m) => m.status === 'complete').length;
        const phaseBadge = phaseColor(phase);
        const phaseRecord = phaseByName[phase];

        return (
          <div key={phase} className="card overflow-hidden">
            <button
              onClick={() => togglePhase(phase)}
              className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200"
            >
              <div className="flex items-center gap-3 flex-wrap">
                {isCollapsed ? <ChevronRight size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                <span className={`badge ${phaseBadge}`}>{phase}</span>
                <span className="text-xs text-gray-400">{completedCount}/{items.length} complete</span>
                {phaseRecord && (
                  <PhaseDateEditor
                    phase={phaseRecord}
                    canEdit={canEdit}
                    onSave={onUpdatePhase}
                  />
                )}
              </div>
            </button>

            {!isCollapsed && (
              <table className="w-full text-sm">
                <thead className="bg-white border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-2 font-medium text-gray-500 text-xs">Key Task</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Status</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Due</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Completed</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 align-top">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{m.name}</div>
                        {m.notes && <div className="text-xs text-gray-400 mt-0.5 max-w-xs">{m.notes}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${statusColor(MILESTONE_STATUSES, m.status)}`}>
                          {m.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {m.due_date ? format(parseISO(m.due_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {m.completed_date ? format(parseISO(m.completed_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {canEdit && (
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => onEdit(m)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-brand-600">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => onDelete(m.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
