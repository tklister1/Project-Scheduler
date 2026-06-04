import { useMemo } from 'react';
import { parseISO, format, eachMonthOfInterval, startOfMonth, endOfMonth, differenceInDays, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { MILESTONE_STATUSES, statusColor } from '../lib/constants';

const STATUS_BAR_COLORS = {
  pending: 'bg-gray-300',
  in_progress: 'bg-brand-500',
  complete: 'bg-green-500',
  blocked: 'bg-red-400',
  cancelled: 'bg-gray-200',
};

export default function GanttChart({ milestones, project }) {
  const datedMilestones = milestones.filter((m) => m.start_date && m.due_date);

  const { months, rangeStart, totalDays } = useMemo(() => {
    if (datedMilestones.length === 0) {
      const now = new Date();
      const start = subMonths(startOfMonth(now), 1);
      const end = addMonths(endOfMonth(now), 4);
      const months = eachMonthOfInterval({ start, end });
      return { months, rangeStart: start, totalDays: differenceInDays(end, start) };
    }

    const dates = datedMilestones.flatMap((m) => [parseISO(m.start_date), parseISO(m.due_date)]);
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    const rangeStart = startOfMonth(subMonths(minDate, 1));
    const rangeEnd = endOfMonth(addMonths(maxDate, 1));
    const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
    const totalDays = differenceInDays(rangeEnd, rangeStart) + 1;
    return { months, rangeStart, totalDays };
  }, [datedMilestones]);

  function pct(date) {
    return (differenceInDays(date, rangeStart) / totalDays) * 100;
  }

  function barWidth(start, end) {
    return Math.max(0.5, pct(end) - pct(start));
  }

  if (datedMilestones.length === 0) {
    return (
      <div className="card p-12 text-center text-gray-400">
        <p>No milestones with start and due dates to display on the Gantt chart.</p>
        <p className="text-sm mt-1">Add start and due dates to your milestones to see them here.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <div style={{ minWidth: '700px' }}>
        {/* Month headers */}
        <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
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

        {/* Today line reference */}
        <div className="relative">
          {datedMilestones.map((m) => {
            const start = parseISO(m.start_date);
            const end = parseISO(m.due_date);
            const left = pct(start);
            const width = barWidth(start, end);
            const barColor = STATUS_BAR_COLORS[m.status] || 'bg-gray-300';

            return (
              <div key={m.id} className="flex items-center hover:bg-gray-50 border-b border-gray-100" style={{ height: '44px' }}>
                <div className="w-56 shrink-0 px-4 text-sm font-medium text-gray-800 truncate border-r border-gray-200">
                  {m.name}
                  <div className="text-xs text-gray-400 font-normal capitalize">{m.category}</div>
                </div>
                <div className="flex-1 relative h-full">
                  {/* Grid lines */}
                  {months.map((mon) => (
                    <div
                      key={mon.toISOString()}
                      className="absolute top-0 bottom-0 border-r border-gray-100"
                      style={{ left: `${pct(endOfMonth(mon))}%` }}
                    />
                  ))}

                  {/* Today marker */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-red-400 z-10 opacity-60"
                    style={{ left: `${pct(new Date())}%` }}
                  />

                  {/* Bar */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-full ${barColor} opacity-90 flex items-center px-2`}
                    style={{ left: `${left}%`, width: `${width}%`, minWidth: '8px' }}
                    title={`${m.name}: ${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`}
                  >
                    <span className="text-white text-xs font-medium truncate hidden sm:block">{m.name}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-4 text-xs text-gray-500">
          {Object.entries(STATUS_BAR_COLORS).map(([status, cls]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${cls}`} />
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
