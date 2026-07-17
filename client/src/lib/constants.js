export const MILESTONE_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'complete', label: 'Complete', color: 'bg-green-100 text-green-700' },
];

export const PHASES = [
  { value: 'Entitlements & Permitting', color: 'bg-violet-100 text-violet-700' },
  { value: 'Design & Engineering', color: 'bg-sky-100 text-sky-700' },
  { value: 'Construction', color: 'bg-amber-100 text-amber-700' },
  { value: 'Financing', color: 'bg-gray-100 text-gray-600' },
  { value: 'Marketing', color: 'bg-gray-100 text-gray-600' },
  { value: 'Legal', color: 'bg-gray-100 text-gray-600' },
  { value: 'Closing', color: 'bg-gray-100 text-gray-600' },
];

// Values for select dropdowns
export const MILESTONE_CATEGORIES = PHASES.map((p) => p.value);

export const PHASE_ORDER = PHASES.map((p) => p.value);

export function phaseColor(phase) {
  return PHASES.find((p) => p.value === phase)?.color || 'bg-gray-100 text-gray-600';
}

export const PROJECT_TYPES = ['Multi-Family', 'LIHTC', 'Single-Family', 'Retail', 'Mixed-Use', 'Owners Rep'];

export const PROJECT_STATUSES = [
  { value: 'pre_development', label: 'Pre-Development', color: 'bg-purple-100 text-purple-700' },
  { value: 'under_construction', label: 'Under Construction', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'stabilization', label: 'Stabilization', color: 'bg-blue-100 text-blue-700' },
  { value: 'stabilized', label: 'Completed', color: 'bg-green-100 text-green-700' },
];

export function statusColor(statuses, value) {
  return statuses.find((s) => s.value === value)?.color || 'bg-gray-100 text-gray-600';
}
