import { useEffect, useMemo, useState } from 'react';
import {
  getMonthDayCount,
  getMonthLabel,
  getMonthStartWeekday,
  shiftMonth
} from '../utils/date';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MOBILE_WEEKDAYS = WEEKDAYS.slice(0, 5);

function parseDateString(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekStartDate(dateString) {
  const date = parseDateString(dateString);
  const weekdayIndex = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - weekdayIndex);
  return formatDateKey(date);
}

function getMobileWeekLabel(week) {
  const visibleDays = week.days.filter(Boolean);
  if (!visibleDays.length) {
    return '';
  }

  const first = parseDateString(visibleDays[0].date);
  const last = parseDateString(visibleDays[visibleDays.length - 1].date);
  const firstLabel = first.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const lastLabel = last.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return firstLabel === lastLabel ? firstLabel : `${firstLabel} - ${lastLabel}`;
}

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

function MonthlyCalendar({
  month,
  dayCounts,
  totalDesks,
  onMonthChange,
  onDateSelect,
  minDate,
  maxDate,
  minMonth,
  maxMonth,
  selectedDate
}) {
  const dayCount = getMonthDayCount(month);
  const leadingBlanks = getMonthStartWeekday(month);
  const [year, monthValue] = month.split('-').map(Number);
  const previousMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);
  const canGoPreviousMonth = !minMonth || previousMonth >= minMonth;
  const canGoNextMonth = !maxMonth || nextMonth <= maxMonth;

  const cells = useMemo(
    () => [
      ...Array.from({ length: leadingBlanks }, (_item, index) => ({ key: `blank-${index}`, blank: true })),
      ...Array.from({ length: dayCount }, (_item, index) => {
        const dayNumber = index + 1;
        const date = `${month}-${String(dayNumber).padStart(2, '0')}`;
        const bookedCount = dayCounts[date] || 0;
        const jsDayOfWeek = new Date(year, monthValue - 1, dayNumber).getDay();
        const weekdayIndex = (jsDayOfWeek + 6) % 7;
        const isWeekend = jsDayOfWeek === 0 || jsDayOfWeek === 6;
        const isPast = Boolean(minDate && date < minDate);
        const isBeyondMax = Boolean(maxDate && date > maxDate);
        const isOutOfRange = isPast || isBeyondMax;

        return {
          key: date,
          date,
          dayNumber,
          bookedCount,
          isWeekend,
          isOutOfRange,
          weekdayIndex,
          blank: false
        };
      })
    ],
    [leadingBlanks, dayCount, month, dayCounts, year, monthValue, minDate, maxDate]
  );

  const mobileWeeks = useMemo(() => {
    const weekMap = new Map();

    cells.forEach((cell) => {
      if (cell.blank || cell.isWeekend) {
        return;
      }

      const weekKey = getWeekStartDate(cell.date);
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { key: weekKey, days: Array(5).fill(null) });
      }

      const week = weekMap.get(weekKey);
      if (cell.weekdayIndex >= 0 && cell.weekdayIndex <= 4) {
        week.days[cell.weekdayIndex] = cell;
      }
    });

    return [...weekMap.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [cells]);

  const [mobileWeekIndex, setMobileWeekIndex] = useState(0);

  useEffect(() => {
    if (!mobileWeeks.length) {
      setMobileWeekIndex(0);
      return;
    }

    const selectedIndex =
      selectedDate && selectedDate.startsWith(month)
        ? mobileWeeks.findIndex((week) => week.days.some((day) => day?.date === selectedDate))
        : -1;

    if (selectedIndex >= 0) {
      setMobileWeekIndex(selectedIndex);
      return;
    }

    const firstAvailableWeekIndex = mobileWeeks.findIndex((week) => week.days.some((day) => day && !day.isOutOfRange));
    setMobileWeekIndex(firstAvailableWeekIndex >= 0 ? firstAvailableWeekIndex : 0);
  }, [month, selectedDate, mobileWeeks]);

  const mobileWeek = mobileWeeks[mobileWeekIndex] ?? null;
  const canGoPreviousWeek = mobileWeekIndex > 0;
  const canGoNextWeek = mobileWeekIndex < mobileWeeks.length - 1;

  const renderDayCell = (cell, isMobile) => {
    if (!cell) {
      return (
        <div className={`rounded-lg bg-slate-50 ${isMobile ? 'h-24' : 'h-20 sm:h-24 sm:rounded-xl'}`} />
      );
    }

    const hasBookings = cell.bookedCount > 0;
    const peopleSymbolCount = getPeopleSymbolCount(cell.bookedCount, totalDesks);
    const isWeekend = cell.isWeekend;
    const isDisabledDate = isWeekend || cell.isOutOfRange;
    const isSelectedDate = selectedDate === cell.date && !isDisabledDate;
    const baseClass = isMobile
      ? 'relative h-24 overflow-hidden rounded-lg border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300'
      : 'relative h-20 overflow-hidden rounded-lg border p-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 sm:h-24 sm:rounded-xl sm:p-2';
    const weekendClass = 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400';
    const bookedDayClass = 'border-emerald-300 bg-emerald-50/70 hover:border-emerald-400 hover:bg-emerald-100/70';
    const openDayClass = 'border-slate-200 bg-slate-50 hover:border-[#13c5e2] hover:bg-[#e8f8fc]';
    const selectedClass = isSelectedDate ? 'ring-2 ring-[#13c5e2] ring-offset-0' : '';

    return (
      <button
        key={cell.key}
        type="button"
        className={`${baseClass} ${isDisabledDate ? weekendClass : hasBookings ? bookedDayClass : openDayClass} ${selectedClass}`}
        onClick={() => {
          if (!isDisabledDate) {
            onDateSelect(cell.date);
          }
        }}
        disabled={isDisabledDate}
      >
        <div className="flex items-start justify-between">
          <div className={`text-xs font-semibold sm:text-sm ${isDisabledDate ? 'text-slate-500' : 'text-slate-900'}`}>
            {cell.dayNumber}
          </div>
          {hasBookings && !isDisabledDate ? (
            <div className={`items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-700 ${isMobile ? 'inline-flex' : 'hidden sm:inline-flex'}`}>
              {Array.from({ length: peopleSymbolCount }, (_item, index) => (
                <PeopleSymbol key={index} index={index} />
              ))}
            </div>
          ) : null}
          {hasBookings && !isDisabledDate && !isMobile ? (
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500 sm:hidden" aria-hidden="true" />
          ) : null}
        </div>
        {isDisabledDate ? (
          <div className={`inline-flex rounded-full bg-slate-200 px-2 py-1 font-semibold text-slate-500 ${isMobile ? 'mt-2 text-[11px]' : 'mt-1 text-[10px] sm:mt-2 sm:text-[11px]'}`}>
            <span className={isMobile ? '' : 'sm:hidden'}>{isMobile ? 'Unavailable' : 'N/A'}</span>
            {!isMobile ? <span className="hidden sm:inline">Unavailable</span> : null}
          </div>
        ) : (
          <div
            className={`inline-flex rounded-full px-2 py-1 font-medium ${getAvailabilityBadgeClass(cell.bookedCount, totalDesks)} ${isMobile ? 'mt-2 text-[11px]' : 'mt-1 text-[10px] sm:mt-2 sm:text-[11px]'}`}
          >
            <span>
              {cell.bookedCount}/{totalDesks}
            </span>
            <span className={isMobile ? '' : 'hidden sm:inline'}>&nbsp;Desks</span>
          </div>
        )}
        <div className={`${isMobile ? 'mt-1.5 min-h-[16px]' : 'mt-1.5 hidden min-h-[16px] sm:block'}`}>
          {isWeekend ? (
            <span className="text-[11px] font-medium text-slate-500">Weekend</span>
          ) : peopleSymbolCount > 0 ? null : (
            <span className="text-[11px] font-medium text-slate-500">No bookings</span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4 md:p-6">
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#13c5e2] hover:bg-[#e8f8fc] disabled:cursor-not-allowed disabled:opacity-45 sm:px-3 sm:text-sm"
          onClick={() => onMonthChange(previousMonth)}
          disabled={!canGoPreviousMonth}
        >
          <span className="sm:hidden">←</span>
          <span className="hidden sm:inline">Previous</span>
        </button>
        <h2 className="px-1 text-base font-bold text-slate-900 sm:text-lg">{getMonthLabel(month)}</h2>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#13c5e2] hover:bg-[#e8f8fc] disabled:cursor-not-allowed disabled:opacity-45 sm:px-3 sm:text-sm"
          onClick={() => onMonthChange(nextMonth)}
          disabled={!canGoNextMonth}
        >
          <span className="sm:hidden">→</span>
          <span className="hidden sm:inline">Next</span>
        </button>
      </div>

      <div className="mb-2 flex items-center justify-between gap-2 sm:hidden">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#13c5e2] hover:bg-[#e8f8fc] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => setMobileWeekIndex((current) => Math.max(0, current - 1))}
          disabled={!canGoPreviousWeek}
        >
          ←
        </button>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {mobileWeek ? getMobileWeekLabel(mobileWeek) : ''}
        </p>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#13c5e2] hover:bg-[#e8f8fc] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => setMobileWeekIndex((current) => Math.min(mobileWeeks.length - 1, current + 1))}
          disabled={!canGoNextWeek}
        >
          →
        </button>
      </div>

      <div className="mb-1 grid grid-cols-5 gap-1.5 pb-1 sm:hidden">
        {MOBILE_WEEKDAYS.map((label) => (
          <div key={`mobile-${label}`} className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-1.5 sm:hidden">
        {mobileWeek
          ? mobileWeek.days.map((cell, index) => (
              <div key={`${mobileWeek.key}-${MOBILE_WEEKDAYS[index]}`}>{renderDayCell(cell, true)}</div>
            ))
          : null}
      </div>

      <div className="hidden grid-cols-7 gap-1.5 sm:grid sm:gap-2">
        {WEEKDAYS.map((label) => (
          <div key={label} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:pb-2 sm:text-xs">
            <span className="sm:hidden">{label.charAt(0)}</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}

        {cells.map((cell) => {
          if (cell.blank) {
            return <div key={cell.key} className="h-20 rounded-lg bg-slate-50 sm:h-24 sm:rounded-xl" />;
          }

          return renderDayCell(cell, false);
        })}
      </div>
    </div>
  );
}

export default MonthlyCalendar;
