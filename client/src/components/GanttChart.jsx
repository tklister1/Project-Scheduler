import { useMemo } from 'react';
import { parseISO, format, eachMonthOfInterval, startOfMonth, endOfMonth, differenceInDays, addMonths, subMonths } from 'date-fns';
import { PHASE_ORDER } from '../lib/constants';

const STATUS_COLORS = {
  pending: '#9ca3af',
  in_progress: '#0ea5e9',
  complete: '#22c55e',
  blocked: '#f87171',
  cancelled: '#d1d5db',
};

const PHASE_COLORS = {
  'Entitlements & Permitting': { bar: '#ede9fe', border: '#a78bfa', text: '#7c3aed' },
  'Design & Engineering':      { bar: '#e0f2fe', border: '#38bdf8', text: '#0369a1' },
  'Construction':              { bar: '#fef3c7', border: '#fbbf24', text: '#b45309' },
};

const DEFAULT_COLORS = { bar: '#f3f4f6', border: '#9ca3af', text: '#6b7280' };

export default function GanttChart({ milestones = [], phases = [] }) {
  const datedMilestones = milestones.filter((m) => m.due_date);
  const phaseByName = Object.fromEntries(phases.map((p) => [p.name, p]));

  const { months, rangeStart, totalDays } = useMemo(() => {
    const now = new Date();
    const allDates = [
      ...datedMilestones.map((m) => parseISO(m.due_date)),
      ...phases.flatMap((p) => [
        p.start_date ? parseISO(p.start_date) : null,
        p.end_date ? parseISO(p.end_date) : null,
      ].filter(Boolean)),
    ];

    const start = allDates.length > 0
      ? startOfMonth(subMonths(new Date(Math.min(...allDates)), 1))
      : subMonths(startOfMonth(now), 1);
    const end = allDates.length > 0
      ? endOfMonth(addMonths(new Date(Math.max(...allDates)), 1))
      : addMonths(endOfMonth(now), 4);

    return {
      months: eachMonthOfInterval({ start, end }),
      rangeStart: start,
      totalDays: differenceInDays(end, start) + 1,
    };
  }, [datedMilestones.length, phases]);

  function pct(date) {
    return (differenceInDays(date, rangeStart) / totalDays) * 100;
  }

  if (datedMilestones.length === 0 && phases.every((p) => !p.start_date && !p.end_date)) {
    return (
      <div className="card p-12 text-center text-gray-400">
        <p>No dates to display yet.</p>
        <p className="text-sm mt-1">Add due dates to key tasks or set phase date ranges to see the Gantt chart.</p>
      </div>
    );
  }

  const knownPhaseSet = new Set(PHASE_ORDER);

  const phaseGroups = [
    ...PHASE_ORDER
      .map((name) => ({ name, items: datedMilestones.filter((m) => m.category === name) }))
      .filter((g) => g.items.length > 0 || phaseByName[g.name]?.start_date || phaseByName[g.name]?.end_date),
    ...(datedMilestones.filter((m) => !knownPhaseSet.has(m.category)).length > 0
      ? [{ name: 'Other', items: datedMilestones.filter((m) => !knownPhaseSet.has(m.category)) }]
      : []),
  ];

  const todayPct = pct(new Date());

  return (
    <div className="card overflow-x-auto">
      <div style={{ minWidth: '700px' }}>
        {/* Month headers */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="w-56 shrink-0 px-4 py-2 text-xs font-medium text-gray-500 border-r border-gray-200">
            Key Task
          </div>
          <div className="flex-1 flex">
            {months.map((m) => (
              <div
                key={m.toISOString()}
                className="text-xs font-medium text-gray-500 py-2 px-1 border-r border-gray-100 text-center"
                style={{ width: `${(differenceInDays(endOfMonth(m), startOfMonth(m)) + 1) / totalDays * 100}%` }}
              >
                {format(m, 'MMM yy')}
              </div>
            ))}
          </div>
        </div>

        {/* Phase groups */}
        {phaseGroups.map(({ name: phaseName, items }) => {
          const colors = PHASE_COLORS[phaseName] || DEFAULT_COLORS;
          const phaseRecord = phaseByName[phaseName];
          const hasSpan = phaseRecord?.start_date && phaseRecord?.end_date;
          const spanStartPct = hasSpan ? pct(parseISO(phaseRecord.start_date)) : 0;
          const spanWidthPct = hasSpan ? Math.max(0.5, pct(parseISO(phaseRecord.end_date)) - spanStartPct) : 0;

          return (
            <div key={phaseName}>
              {/* Phase header */}
              <div className="flex items-center border-b border-gray-200" style={{ height: '36px', backgroundColor: colors.bar }}>
                <div
                  className="w-56 shrink-0 px-4 text-xs font-semibold border-r border-gray-200 truncate"
                  style={{ color: colors.text, borderLeftColor: colors.border, borderLeftWidth: '3px' }}
                >
                  {phaseName}
                </div>
                <div className="flex-1 relative h-full overflow-hidden">
                  {/* Grid lines */}
                  {months.map((mon) => (
                    <div key={mon.toISOString()} className="absolute top-0 bottom-0 border-r border-gray-100" style={{ left: `${pct(endOfMonth(mon))}%` }} />
                  ))}
                  {/* Today line */}
                  <div className="absolute top-0 bottom-0 w-px bg-red-400 opacity-60 z-10" style={{ left: `${todayPct}%` }} />
                  {/* Phase span bar */}
                  {hasSpan && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 rounded z-10"
                      style={{ left: `${spanStartPct}%`, width: `${spanWidthPct}%`, height: '18px', backgroundColor: colors.border, opacity: 0.35 }}
                      title={`${phaseName}: ${format(parseISO(phaseRecord.start_date), 'MMM d')} – ${format(parseISO(phaseRecord.end_date), 'MMM d, yyyy')}`}
                    />
                  )}
                  {hasSpan && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 text-xs font-medium z-20 whitespace-nowrap"
                      style={{ left: `${spanStartPct}%`, color: colors.text, paddingLeft: '4px' }}
                    >
                      {format(parseISO(phaseRecord.start_date), 'MMM d')} – {format(parseISO(phaseRecord.end_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </div>

              {/* Key task rows */}
              {items.map((m) => {
                const date = parseISO(m.due_date);
                const leftPct = pct(date);
                const dotColor = STATUS_COLORS[m.status] || STATUS_COLORS.pending;

                return (
                  <div key={m.id} className="flex items-center hover:bg-gray-50 border-b border-gray-100" style={{ height: '44px' }}>
                    <div className="w-56 shrink-0 px-4 pl-7 border-r border-gray-200">
                      <div className="text-sm font-medium text-gray-800 truncate">{m.name}</div>
                    </div>
                    <div className="flex-1 relative h-full overflow-hidden">
                      {/* Grid lines */}
                      {months.map((mon) => (
                        <div key={mon.toISOString()} className="absolute top-0 bottom-0 border-r border-gray-100" style={{ left: `${pct(endOfMonth(mon))}%` }} />
                      ))}
                      {/* Today line */}
                      <div className="absolute top-0 bottom-0 w-px bg-red-400 opacity-60 z-10" style={{ left: `${todayPct}%` }} />
                      {/* Phase background */}
                      {hasSpan && (
                        <div
                          className="absolute top-0 bottom-0 z-0"
                          style={{ left: `${spanStartPct}%`, width: `${spanWidthPct}%`, backgroundColor: colors.bar, opacity: 0.5 }}
                        />
                      )}
                      {/* Diamond */}
                      <div
                        className="absolute top-1/2 z-20"
                        style={{ left: `${leftPct}%`, transform: 'translate(-50%, -50%)' }}
                        title={`${m.name} — due ${format(date, 'MMM d, yyyy')}`}
                      >
                        <div style={{ width: '14px', height: '14px', backgroundColor: dotColor, transform: 'rotate(45deg)', borderRadius: '2px' }} />
                      </div>
                      {/* Date label */}
                      <div
                        className="absolute top-1/2 z-20 text-xs text-gray-500 whitespace-nowrap"
                        style={{ left: `calc(${leftPct}% + 12px)`, transform: 'translateY(-50%)' }}
                      >
                        {format(date, 'MMM d')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Legend */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-4 text-xs text-gray-500">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div style={{ width: '10px', height: '10px', backgroundColor: color, transform: 'rotate(45deg)', borderRadius: '1px' }} />
              <span className="capitalize">{status.replace('_', ' ')}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-px h-4 bg-red-400 opacity-60" />
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
