import { useEffect, useRef } from 'react';
import { getDeskZone } from '../config/floorPlanSchema';
import { getInitials } from '../utils/bookings';
import { getDateParts } from '../utils/date';
import { Avatar, DESK_LOOK } from './FloorPlan';

function ChevronIcon({ direction }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {direction === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

const PRIMARY_BUTTON =
  'flex h-[50px] w-full items-center justify-center rounded-xl bg-[#04588C] px-4 text-base font-bold text-white transition hover:bg-sfNavy disabled:cursor-not-allowed disabled:opacity-60';
const DANGER_BUTTON =
  'flex h-[50px] w-full items-center justify-center rounded-xl border border-[#E8B4AE] bg-white px-4 text-base font-bold text-[#B42318] transition hover:bg-[#FEF3F2] disabled:cursor-not-allowed disabled:opacity-60';
const QUIET_BUTTON =
  'flex h-12 w-full items-center justify-center rounded-xl bg-[#F1F4F7] px-4 text-base font-semibold text-[#334155] transition hover:bg-[#E4E9EF]';

export const CARD = 'rounded-[20px] bg-white shadow-[0_12px_40px_rgba(0,20,35,0.35)]';

// Mon–Fri buttons for the week around the selected date, with week arrows.
// On phones the strip is compact and can also be swiped to change week.
export function WeekStrip({
  days,
  selectedDate,
  onSelectDate,
  onPreviousWeek,
  onNextWeek,
  canGoPreviousWeek,
  canGoNextWeek,
  totalDesks
}) {
  const touchStart = useRef(null);
  const arrowClass =
    'flex h-11 w-9 flex-none items-center justify-center rounded-xl border border-white/25 bg-white/5 text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30 sm:h-16 sm:w-10';

  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) {
      return;
    }

    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) {
      return;
    }

    if (dx < 0 && canGoNextWeek) {
      onNextWeek();
    } else if (dx > 0 && canGoPreviousWeek) {
      onPreviousWeek();
    }
  };

  return (
    <div
      className="flex w-full touch-pan-y items-center gap-1 sm:w-auto sm:gap-2"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button type="button" aria-label="Previous week" className={arrowClass} onClick={onPreviousWeek} disabled={!canGoPreviousWeek}>
        <ChevronIcon direction="left" />
      </button>
      {days.map((day) => {
        const isActive = day.date === selectedDate;
        const parts = getDateParts(day.date);
        const fill = day.count == null ? null : Math.min(100, Math.round((day.count / totalDesks) * 100));
        return (
          <button
            key={day.date}
            type="button"
            aria-pressed={isActive}
            aria-label={`${parts.weekdayLong} ${parts.day} ${parts.monthLong}${day.hasMine ? ', you are booked in' : ''}${
              day.count == null ? '' : `, ${day.count} of ${totalDesks} desks booked`
            }`}
            disabled={day.disabled}
            onClick={() => onSelectDate(day.date)}
            className={`relative flex h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-xl border px-1 transition disabled:cursor-not-allowed disabled:opacity-40 sm:h-16 sm:w-[76px] sm:flex-none sm:items-start sm:justify-between sm:px-2.5 sm:py-2 ${
              isActive
                ? 'border-sfIce bg-sfIce text-sfNavy'
                : 'border-white bg-white text-sfNavy hover:border-sfIce'
            }`}
          >
            <span className="flex w-full flex-col items-center sm:flex-row sm:items-center sm:justify-between">
              <span
                className={`text-[10px] font-semibold uppercase leading-none tracking-[0.04em] sm:text-[13px] sm:normal-case sm:leading-normal sm:tracking-normal ${
                  isActive ? 'text-sfNavy/75' : 'text-[#5B6475]'
                }`}
              >
                {parts.weekdayShort}
                <span className="ml-1 hidden text-[17px] font-bold text-sfNavy sm:inline">{parts.day}</span>
              </span>
              <span className="mt-0.5 text-base font-bold leading-none sm:hidden">{parts.day}</span>
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full sm:static sm:h-2 sm:w-2"
                style={{ background: day.hasMine ? (isActive ? '#012E44' : '#04588C') : 'transparent' }}
              />
            </span>
            <span
              aria-hidden="true"
              className={`hidden h-1 w-full overflow-hidden rounded-sm sm:block ${isActive ? 'bg-sfNavy/20' : 'bg-[#E4E9EF]'}`}
            >
              {fill != null ? (
                <span className={`block h-1 ${isActive ? 'bg-sfNavy' : 'bg-[#007AB7]'}`} style={{ width: `${fill}%` }} />
              ) : null}
            </span>
          </button>
        );
      })}
      <button type="button" aria-label="Next week" className={arrowClass} onClick={onNextWeek} disabled={!canGoNextWeek}>
        <ChevronIcon direction="right" />
      </button>
    </div>
  );
}

// What you can do with the selected desk. Used in the side panel and the phone sheet.
export function DeskDetails({
  deskId,
  booking,
  status,
  dateLabel,
  isAdmin,
  canBookForOthers = false,
  canRemove = false,
  myBooking,
  bookingFor,
  onBookingForChange,
  isSubmitting,
  onBook,
  onRemove,
  onClose,
  inSheet = false
}) {
  const look = DESK_LOOK[status];
  const zone = getDeskZone(deskId);
  const guestName = bookingFor.trim();
  const forSomeoneElse = canBookForOthers && Boolean(guestName);
  const isMove = !isAdmin && !forSomeoneElse && status === 'free' && myBooking && myBooking.deskId !== deskId;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3.5">
        <span
          className="flex h-14 w-14 flex-none items-center justify-center rounded-[14px] font-heading text-[22px] font-bold"
          style={{ background: look.bg, border: `1.5px solid ${look.border}`, color: look.text }}
        >
          {deskId}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 font-heading text-[22px] font-semibold leading-tight">Desk {deskId}</h2>
          <p className="mt-0.5 text-[15px] text-[#4A5568]">
            {zone} · {dateLabel}
          </p>
        </div>
        {!inSheet ? (
          <button
            type="button"
            aria-label="Close desk details"
            onClick={onClose}
            className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-[#F1F4F7] text-[#4A5568] transition hover:bg-[#E4E9EF]"
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>

      {status === 'free' ? <p className="text-base font-semibold text-[#036483]">Free all day</p> : null}
      {status === 'mine' ? <p className="text-base font-semibold text-[#04588C]">You're booked in here</p> : null}
      {status === 'booked' ? (
        <div className="flex items-center gap-2.5">
          <Avatar name={booking?.username} size={34} />
          <span className="text-base">
            Booked by <strong>{booking?.username}</strong>
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {status === 'free' && canBookForOthers ? (
          <div className="mb-1">
            <label htmlFor={`booking-for-${inSheet ? 'sheet' : 'panel'}`} className="block text-sm font-semibold text-[#334155]">
              Booking for (optional)
            </label>
            <input
              id={`booking-for-${inSheet ? 'sheet' : 'panel'}`}
              type="text"
              value={bookingFor}
              onChange={(event) => onBookingForChange(event.target.value)}
              placeholder="e.g. Giovana (Marketing)"
              maxLength={60}
              disabled={isSubmitting}
              className="mt-1 h-11 w-full rounded-xl border border-[#D5DDE5] px-3 text-base text-[#0D0E20] placeholder:text-[#8792A2] focus:border-[#007AB7] focus:outline-none focus:ring-2 focus:ring-[#007AB7]/25"
            />
            <p className="mt-1 text-[13px] text-[#5B6475]">
              {isAdmin ? 'Leave blank to book under your own name.' : 'Add a name to block this desk for someone else, or leave blank to book it for yourself.'}
            </p>
          </div>
        ) : null}

        {status === 'free' ? (
          <button type="button" className={PRIMARY_BUTTON} onClick={onBook} disabled={isSubmitting}>
            {isSubmitting
              ? 'Saving…'
              : forSomeoneElse
                ? `Book for ${guestName}`
                : isMove
                  ? inSheet
                    ? `Move here from ${myBooking.deskId}`
                    : 'Move my booking here'
                  : `Book desk ${deskId}`}
          </button>
        ) : null}
        {isMove && !inSheet ? (
          <p className="text-center text-[13px] text-[#5B6475]">This frees up {myBooking.deskId} for someone else</p>
        ) : null}

        {status === 'mine' ? (
          <button type="button" className={DANGER_BUTTON} onClick={onRemove} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Cancel my booking'}
          </button>
        ) : null}
        {status === 'booked' && canRemove ? (
          <button type="button" className={DANGER_BUTTON} onClick={onRemove} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isAdmin ? 'Remove this booking' : `Cancel booking for ${booking?.username ?? 'them'}`}
          </button>
        ) : null}

        {inSheet ? (
          <button type="button" className={QUIET_BUTTON} onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function BottomSheet({ open, onClose, children, label }) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <button
        type="button"
        aria-label="Close desk details"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-pointer bg-[#0D0E20]/30"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="absolute inset-x-0 bottom-0 flex flex-col gap-4 rounded-t-3xl bg-white px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_30px_rgba(13,14,32,0.18)]"
      >
        <span aria-hidden="true" className="h-[5px] w-10 self-center rounded-full bg-[#D5DDE5]" />
        {children}
      </section>
    </div>
  );
}

export function YourDeskCard({ isAdmin, myBooking, dateLabel, freeCount, onShowOnPlan, onCancel, isSubmitting }) {
  return (
    <section className={`${CARD} flex flex-col gap-3.5 p-[22px]`}>
      <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#5B6475]">
        {isAdmin ? 'Admin' : 'Your desk'} · {dateLabel}
      </p>
      {isAdmin ? (
        <p className="text-[15px] text-[#4A5568]">
          Select any desk to book it for yourself or someone else, or to remove a booking.
        </p>
      ) : myBooking ? (
        <div className="flex flex-col gap-3.5">
          <div className="flex items-baseline gap-3">
            <span className="font-heading text-[44px] font-bold leading-none text-[#04588C]">{myBooking.deskId}</span>
            <span className="text-base text-[#4A5568]">{getDeskZone(myBooking.deskId)}</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onShowOnPlan}
              className="h-11 flex-auto rounded-xl bg-[#04588C] px-4 text-[15px] font-bold text-white transition hover:bg-sfNavy"
            >
              Show on plan
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="h-11 flex-auto rounded-xl border border-[#E8B4AE] bg-white px-4 text-[15px] font-bold text-[#B42318] transition hover:bg-[#FEF3F2] disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="font-heading text-[22px] font-semibold">No desk booked yet</p>
          <p className="mt-1.5 text-[15px] text-[#4A5568]">
            Pick any free desk on the plan. {freeCount} {freeCount === 1 ? 'is' : 'are'} free.
          </p>
        </div>
      )}
    </section>
  );
}

export function InOfficeList({ people, onSelect }) {
  return (
    <section className={`${CARD} px-3 pb-3 pt-[18px]`}>
      <div className="flex items-center justify-between px-2.5 pb-2.5">
        <h2 className="font-heading text-[19px] font-semibold">In the office</h2>
        <span className="text-sm text-[#5B6475]">
          {people.length} {people.length === 1 ? 'person' : 'people'}
        </span>
      </div>
      {people.length === 0 ? (
        <p className="px-2.5 pb-3 pt-2 text-[15px] text-[#4A5568]">Nobody's booked in yet.</p>
      ) : (
        people.map((person) => (
          <button
            key={person.deskId}
            type="button"
            onClick={() => onSelect(person.deskId)}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-[#F3F6F9]"
          >
            <span
              aria-hidden="true"
              className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: person.isMe ? '#04588C' : '#5B6B80' }}
            >
              {getInitials(person.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{person.isMe ? 'You' : person.name}</span>
              <span className="block text-[13px] text-[#5B6475]">{getDeskZone(person.deskId)}</span>
            </span>
            <span className="flex-none rounded-full bg-[#EAEEF1] px-2.5 py-1 text-[13px] font-bold text-[#334155]">
              {person.deskId}
            </span>
          </button>
        ))
      )}
    </section>
  );
}
