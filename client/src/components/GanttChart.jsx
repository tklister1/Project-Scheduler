import { useMemo } from 'react';
import { parseISO, format, eachMonthOfInterval, startOfMonth, endOfMonth, differenceInDays, addMonths, subMonths } from 'date-fns';

const STATUS_COLORS = {
  pending: '#9ca3af',
  in_progress: '#0ea5e9',
  complete: '#22c55e',
  blocked: '#f87171',
  cancelled: '#d1d5db',
};

export default function GanttChart({ milestones }) {
  const datedMilestones = milestones.filter((m) => m.due_date);

  const { months, rangeStart, totalDays } = useMemo(() => {
    const now = new Date();
    if (datedMilestones.length === 0) {
      const start = subMonths(startOfMonth(now), 1);
      const end = addMonths(endOfMonth(now), 4);
      return { months: eachMonthOfInterval({ start, end }), rangeStart: start, totalDays: differenceInDays(end, start) };
    }
    const dates = datedMilestones.map((m) => parseISO(m.due_date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const rangeStart = startOfMonth(subMonths(minDate, 1));
    const rangeEnd = endOfMonth(addMonths(maxDate, 1));
    return {
      months: eachMonthOfInterval({ start: rangeStart, end: rangeEnd }),
      rangeStart,
      totalDays: differenceInDays(rangeEnd, rangeStart) + 1,
    };
  }, [datedMilestones]);

  function pct(date) {
    return (differenceInDays(date, rangeStart) / totalDays) * 100;
  }

  if (datedMilestones.length === 0) {
    return (
      <div className="card p-12 text-center text-gray-400">
        <p>No milestones with due dates to display on the Gantt chart.</p>
        <p className="text-sm mt-1">Add a due date to your milestones to see them here.</p>
      </div>
    );
  }

  const ROW_HEIGHT = 48;

  return (
    <div className="card overflow-x-auto">
      <div style={{ minWidth: '700px' }}>
        {/* Month headers */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="w-56 shrink-0 px-4 py-2 text-xs font-medium text-gray-500 border-r border-gray-200">Milestone</div>
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

        {/* Rows */}
        {datedMilestones.map((m) => {
          const date = parseISO(m.due_date);
          const left = pct(date);
          const color = STATUS_COLORS[m.status] || STATUS_COLORS.pending;

          return (
            <div key={m.id} className="flex items-center hover:bg-gray-50 border-b border-gray-100" style={{ height: `${ROW_HEIGHT}px` }}>
              <div className="w-56 shrink-0 px-4 border-r border-gray-200">
                <div className="text-sm font-medium text-gray-800 truncate">{m.name}</div>
                <div className="text-xs text-gray-400 capitalize">{m.category}</div>
              </div>
              <div className="flex-1 relative h-full">
                {/* Month grid lines */}
                {months.map((mon) => (
                  <div
                    key={mon.toISOString()}
                    className="absolute top-0 bottom-0 border-r border-gray-100"
                    style={{ left: `${pct(endOfMonth(mon))}%` }}
                  />
                ))}

                {/* Today marker */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-400 opacity-60 z-10"
                  style={{ left: `${pct(new Date())}%` }}
                />

                {/* Diamond marker */}
                <div
                  className="absolute top-1/2 z-20"
                  style={{ left: `${left}%`, transform: 'translate(-50%, -50%)' }}
                  title={`${m.name} — due ${format(date, 'MMM d, yyyy')}`}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      backgroundColor: color,
                      transform: 'rotate(45deg)',
                      borderRadius: '2px',
                    }}
                  />
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
