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
  'Construction':               { bar: '#fef3c7', border: '#fbbf24', text: '#b45309' },
};

export default function GanttChart({ milestones, phases = [] }) {
  const datedMilestones = milestones.filter((m) => m.due_date);
  const phaseByName = Object.fromEntries(phases.map((p) => [p.name, p]));

  const { months, rangeStart, totalDays } = useMemo(() => {
    const now = new Date();
    const allDates = [
      ...datedMilestones.map((m) => parseISO(m.due_date)),
      ...phases.flatMap((p) => [p.start_date && parseISO(p.start_date), p.end_date && parseISO(p.end_date)].filter(Boolean)),
    ];

    if (allDates.length === 0) {
      const start = subMonths(startOfMonth(now), 1);
      const end = addMonths(endOfMonth(now), 4);
      return { months: eachMonthOfInterval({ start, end }), rangeStart: start, totalDays: differenceInDays(end, start) };
    }

    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    const rangeStart = startOfMonth(subMonths(minDate, 1));
    const rangeEnd = endOfMonth(addMonths(maxDate, 1));
    return {
      months: eachMonthOfInterval({ start: rangeStart, end: rangeEnd }),
      rangeStart,
      totalDays: differenceInDays(rangeEnd, rangeStart) + 1,
    };
  }, [datedMilestones, phases]);

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

  const knownPhases = new Set(PHASE_ORDER);
  const phaseGroups = PHASE_ORDER
    .map((phase) => ({ phase, items: datedMilestones.filter((m) => m.category === phase) }))
    .filter((g) => g.items.length > 0 || (phaseByName[phase]?.start_date || phaseByName[phase]?.end_date));

  const otherItems = datedMilestones.filter((m) => !knownPhases.has(m.category));
  if (otherItems.length > 0) phaseGroups.push({ phase: 'Other', items: otherItems });

  function MonthGridLines() {
    return months.map((mon) => (
      <div
        key={mon.toISOString()}
        className="absolute top-0 bottom-0 border-r border-gray-100"
        style={{ left: `${pct(endOfMonth(mon))}%` }}
      />
    ));
  }

  function TodayLine() {
    return (
      <div
        className="absolute top-0 bottom-0 w-px bg-red-400 opacity-60 z-10"
        style={{ left: `${pct(new Date())}%` }}
      />
    );
  }

  return (
    <div className="card overflow-x-auto">
      <div style={{ minWidth: '700px' }}>
        {/* Month headers */}
        <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-20">
          <div className="w-56 shrink-0 px-4 py-2 text-xs font-medium text-gray-500 border-r border-gray-200">Key Task</div>
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

        {phaseGroups.map(({ phase, items }) => {
          const colors = PHASE_COLORS[phase] || { bar: '#f3f4f6', border: '#9ca3af', text: '#6b7280' };
          const phaseRecord = phaseByName[phase];
          const hasSpan = phaseRecord?.start_date && phaseRecord?.end_date;

          return (
            <div key={phase}>
              {/* Phase header row */}
              <div className="flex items-center border-b border-gray-200" style={{ height: '36px', backgroundColor: colors.bar }}>
                <div
                  className="w-56 shrink-0 px-4 text-xs font-semibold border-r border-gray-200 truncate flex items-center gap-2"
                  style={{ color: colors.text, borderLeftColor: colors.border, borderLeftWidth: '3px' }}
                >
                  {phase}
                </div>
                <div className="flex-1 relative h-full">
                  <MonthGridLines />
                  <TodayLine />

                  {/* Phase span bar */}
                  {hasSpan && (() => {
                    const spanStart = parseISO(phaseRecord.start_date);
                    const spanEnd = parseISO(phaseRecord.end_date);
                    const left = pct(spanStart);
                    const width = Math.max(0.5, pct(spanEnd) - left);
                    return (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 rounded z-10 flex items-center px-2"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          height: '18px',
                          backgroundColor: colors.border,
                          opacity: 0.35,
                        }}
                        title={`${phase}: ${format(spanStart, 'MMM d')} – ${format(spanEnd, 'MMM d, yyyy')}`}
                      />
                    );
                  })()}

                  {/* Phase date label */}
                  {phaseRecord?.start_date && phaseRecord?.end_date && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 text-xs font-medium z-20 whitespace-nowrap"
                      style={{ left: `${pct(parseISO(phaseRecord.start_date))}%`, color: colors.text, paddingLeft: '4px' }}
                    >
                      {format(parseISO(phaseRecord.start_date), 'MMM d')} – {format(parseISO(phaseRecord.end_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </div>

              {/* Milestone rows */}
              {items.map((m) => {
                const date = parseISO(m.due_date);
                const left = pct(date);
                const color = STATUS_COLORS[m.status] || STATUS_COLORS.pending;

                return (
                  <div key={m.id} className="flex items-center hover:bg-gray-50 border-b border-gray-100" style={{ height: '44px' }}>
                    <div className="w-56 shrink-0 px-4 pl-7 border-r border-gray-200">
                      <div className="text-sm font-medium text-gray-800 truncate">{m.name}</div>
                    </div>
                    <div className="flex-1 relative h-full">
                      <MonthGridLines />
                      <TodayLine />

                      {/* Phase span background for context */}
                      {hasSpan && (() => {
                        const spanStart = parseISO(phaseRecord.start_date);
                        const spanEnd = parseISO(phaseRecord.end_date);
                        return (
                          <div
                            className="absolute top-0 bottom-0 z-0"
                            style={{
                              left: `${pct(spanStart)}%`,
                              width: `${Math.max(0.5, pct(spanEnd) - pct(spanStart))}%`,
                              backgroundColor: colors.bar,
                              opacity: 0.5,
                            }}
                          />
                        );
                      })()}

                      {/* Diamond marker */}
                      <div
                        className="absolute top-1/2 z-20"
                        style={{ left: `${left}%`, transform: 'translate(-50%, -50%)' }}
                        title={`${m.name} — due ${format(date, 'MMM d, yyyy')}`}
                      >
                        <div style={{ width: '14px', height: '14px', backgroundColor: color, transform: 'rotate(45deg)', borderRadius: '2px' }} />
                      </div>

                      {/* Date label */}
                      <div
                        className="absolute top-1/2 z-20 text-xs text-gray-500 whitespace-nowrap"
                        style={{ left: `calc(${left}% + 12px)`, transform: 'translateY(-50%)' }}
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
