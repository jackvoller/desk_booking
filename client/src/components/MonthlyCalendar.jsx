import {
  getMonthDayCount,
  getMonthLabel,
  getMonthStartWeekday,
  shiftMonth
} from '../utils/date';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getAvailabilityBadgeClass(bookedCount, totalDesks) {
  if (!totalDesks || totalDesks <= 0) {
    return 'bg-slate-100 text-slate-700';
  }

  const occupancyRatio = bookedCount / totalDesks;

  if (occupancyRatio >= 1) {
    return 'bg-red-100 text-red-700';
  }

  if (occupancyRatio >= 0.8) {
    return 'bg-orange-100 text-orange-700';
  }

  if (occupancyRatio >= 0.6) {
    return 'bg-amber-100 text-amber-700';
  }

  if (occupancyRatio >= 0.4) {
    return 'bg-yellow-100 text-yellow-700';
  }

  if (occupancyRatio >= 0.2) {
    return 'bg-lime-100 text-lime-700';
  }

  return 'bg-emerald-100 text-emerald-700';
}

function getPeopleSymbolCount(bookedCount, totalDesks) {
  if (bookedCount <= 0) {
    return 0;
  }

  if (!totalDesks || totalDesks <= 0) {
    return 1;
  }

  const occupancyRatio = bookedCount / totalDesks;

  if (occupancyRatio < 0.2) {
    return 1;
  }

  if (occupancyRatio < 0.45) {
    return 2;
  }

  if (occupancyRatio < 0.75) {
    return 3;
  }

  return 4;
}

function PeopleSymbol({ index }) {
  return (
    <svg
      key={`person-${index}`}
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="h-3.5 w-3.5 fill-current"
    >
      <circle cx="8" cy="5" r="3" />
      <path d="M2.5 14c0-2.8 2.4-4.7 5.5-4.7s5.5 1.9 5.5 4.7" />
    </svg>
  );
}

function MonthlyCalendar({ month, dayCounts, totalDesks, onMonthChange, onDateSelect }) {
  const dayCount = getMonthDayCount(month);
  const leadingBlanks = getMonthStartWeekday(month);
  const [year, monthValue] = month.split('-').map(Number);

  const cells = [
    ...Array.from({ length: leadingBlanks }, (_item, index) => ({ key: `blank-${index}`, blank: true })),
    ...Array.from({ length: dayCount }, (_item, index) => {
      const dayNumber = index + 1;
      const date = `${month}-${String(dayNumber).padStart(2, '0')}`;
      const bookedCount = dayCounts[date] || 0;
      const dayOfWeek = new Date(year, monthValue - 1, dayNumber).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      return {
        key: date,
        date,
        dayNumber,
        bookedCount,
        isWeekend,
        blank: false
      };
    })
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-[#13c5e2] hover:bg-[#e8f8fc]"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
        >
          Previous
        </button>
        <h2 className="text-lg font-bold text-slate-900">{getMonthLabel(month)}</h2>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-[#13c5e2] hover:bg-[#e8f8fc]"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS.map((label) => (
          <div key={label} className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </div>
        ))}

        {cells.map((cell) => {
          if (cell.blank) {
            return <div key={cell.key} className="h-24 rounded-xl bg-slate-50" />;
          }

          const hasBookings = cell.bookedCount > 0;
          const peopleSymbolCount = getPeopleSymbolCount(cell.bookedCount, totalDesks);
          const isWeekend = cell.isWeekend;
          const baseClass =
            'h-24 rounded-xl border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300';
          const weekendClass = 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400';
          const bookedDayClass =
            'border-emerald-300 bg-emerald-50/70 hover:border-emerald-400 hover:bg-emerald-100/70';
          const openDayClass = 'border-slate-200 bg-slate-50 hover:border-[#13c5e2] hover:bg-[#e8f8fc]';

          return (
            <button
              key={cell.key}
              type="button"
              className={`${baseClass} ${isWeekend ? weekendClass : hasBookings ? bookedDayClass : openDayClass}`}
              onClick={() => {
                if (!isWeekend) {
                  onDateSelect(cell.date);
                }
              }}
              disabled={isWeekend}
            >
              <div className="flex items-start justify-between">
                <div className={`text-sm font-semibold ${isWeekend ? 'text-slate-500' : 'text-slate-900'}`}>
                  {cell.dayNumber}
                </div>
                {hasBookings && !isWeekend ? (
                  <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                    {Array.from({ length: peopleSymbolCount }, (_item, index) => (
                      <PeopleSymbol key={index} index={index} />
                    ))}
                  </div>
                ) : null}
              </div>
              {isWeekend ? (
                <div className="mt-2 inline-flex rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500">
                  Unavailable
                </div>
              ) : (
                <div
                  className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${getAvailabilityBadgeClass(cell.bookedCount, totalDesks)}`}
                >
                  {cell.bookedCount}/{totalDesks} Desks
                </div>
              )}
              <div className="mt-1.5 min-h-[16px]">
                {isWeekend ? (
                  <span className="text-[11px] font-medium text-slate-500">Weekend</span>
                ) : peopleSymbolCount > 0 ? null : (
                  <span className="text-[11px] font-medium text-slate-500">No bookings</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MonthlyCalendar;
