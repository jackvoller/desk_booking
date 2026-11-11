import { getDeskZone } from '../config/floorPlanSchema';
import { isOwnBooking } from '../utils/bookings';
import { getDateParts, todayDateString } from '../utils/date';
import { CARD } from './DeskPanel';
import { MiniMap } from './FloorPlan';

function bookingKey(booking) {
  return booking._id ?? booking.id ?? `${booking.date}-${booking.deskId}-${booking.userId}`;
}

function TodayCard({ booking, onOpenBooking }) {
  const parts = getDateParts(booking.date);
  return (
    <section aria-label="Today" className="flex items-stretch gap-[18px] rounded-[22px] bg-sfIce p-[18px] text-sfNavy shadow-[0_12px_40px_rgba(0,20,35,0.35)] md:max-w-xl">
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3.5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-sfNavy/75">
            Today · {parts.weekdayShort} {parts.day} {parts.monthShort}
          </p>
          <p className="mt-1.5 font-heading text-[52px] font-bold leading-none">{booking.deskId}</p>
          <p className="mt-1 text-base font-semibold">{getDeskZone(booking.deskId)}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpenBooking(booking)}
          className="flex h-11 items-center gap-2 self-start rounded-xl bg-sfNavy px-4 text-[15px] font-bold text-white transition hover:bg-[#04588C]"
        >
          Show on plan
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      <MiniMap deskId={booking.deskId} className="w-[92px] rounded-[10px] bg-white/40" />
    </section>
  );
}

function BookingRow({ booking, currentUser, isAdmin, isPast, onOpenBooking, onDeleteBooking }) {
  const parts = getDateParts(booking.date);
  return (
    <article className={`${CARD} flex items-center gap-3.5 rounded-[18px] p-3.5`}>
      <div className="w-12 flex-none text-center">
        <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#5B6475]">{parts.weekdayShort}</p>
        <p className="mt-0.5 font-heading text-[26px] font-bold leading-none">{parts.day}</p>
        <p className="mt-0.5 text-xs text-[#5B6475]">{parts.monthShort}</p>
      </div>
      <MiniMap deskId={booking.deskId} className="w-10 rounded-md bg-[#F4F6F9]" />
      <button
        type="button"
        onClick={() => onOpenBooking(booking)}
        className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007AB7]"
        aria-label={`Show desk ${booking.deskId} on ${parts.weekdayLong} ${parts.day} ${parts.monthLong} on the plan`}
      >
        <p className="text-[17px] font-bold">Desk {booking.deskId}</p>
        <p className="mt-0.5 truncate text-sm text-[#4A5568]">
          {isAdmin
            ? booking.username ?? '—'
            : isOwnBooking(booking, currentUser)
              ? getDeskZone(booking.deskId)
              : `For ${booking.username ?? 'someone else'}`}
        </p>
        {isAdmin && booking.email ? <p className="truncate text-xs text-[#5B6475]">{booking.email}</p> : null}
      </button>
      {!isPast || isAdmin ? (
        <button
          type="button"
          aria-label={`Cancel desk ${booking.deskId} on ${parts.weekdayShort} ${parts.day} ${parts.monthLong}`}
          onClick={() => onDeleteBooking(booking)}
          className="h-11 flex-none rounded-xl border border-[#E8B4AE] bg-white px-3.5 text-sm font-bold text-[#B42318] transition hover:bg-[#FEF3F2]"
        >
          {isAdmin ? 'Remove' : 'Cancel'}
        </button>
      ) : null}
    </article>
  );
}

function MyBookings({ bookings, currentUser, isLoading, onOpenBooking, onDeleteBooking, isAdmin, onExportCsv }) {
  const title = isAdmin ? 'All bookings' : 'My bookings';
  const todayKey = todayDateString();

  if (isLoading && !bookings.length) {
    return (
      <section>
        <h1 className="font-heading text-[28px] font-bold text-white md:text-[34px]">{title}</h1>
        <p className="mt-2 text-[15px] text-[#C9DCE6]">Loading bookings…</p>
      </section>
    );
  }

  const sorted = [...bookings].sort((a, b) => a.date.localeCompare(b.date) || a.deskId.localeCompare(b.deskId));
  const todayBooking = !isAdmin
    ? sorted.find((booking) => booking.date === todayKey && isOwnBooking(booking, currentUser)) ?? null
    : null;
  const upcoming = sorted.filter((booking) => booking.date >= todayKey && booking !== todayBooking);
  const past = sorted.filter((booking) => booking.date < todayKey).reverse();
  const upcomingCount = upcoming.length + (todayBooking ? 1 : 0);

  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-[28px] font-bold text-white md:text-[34px]">{title}</h1>
          <p className="mt-1 text-sm text-[#C9DCE6] md:text-[15px]">
            {upcomingCount === 0
              ? isAdmin
                ? 'There are no upcoming bookings.'
                : 'Nothing booked yet.'
              : `${upcomingCount} upcoming ${upcomingCount === 1 ? 'booking' : 'bookings'}`}
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={onExportCsv}
            className="h-11 rounded-xl border border-white/25 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Export to CSV
          </button>
        ) : null}
      </div>

      {todayBooking ? <TodayCard booking={todayBooking} onOpenBooking={onOpenBooking} /> : null}

      <h2 className="mx-1 mt-1.5 text-[13px] font-bold uppercase tracking-[0.08em] text-[#9CC3D6]">Coming up</h2>
      {upcoming.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {upcoming.map((booking) => (
            <BookingRow
              key={bookingKey(booking)}
              booking={booking}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onOpenBooking={onOpenBooking}
              onDeleteBooking={onDeleteBooking}
            />
          ))}
        </div>
      ) : (
        <div className={`${CARD} rounded-[18px] p-5 text-[15px] text-[#4A5568]`}>
          {isAdmin ? 'No upcoming bookings.' : 'Nothing else booked. Pick a desk on the floor plan.'}
        </div>
      )}

      {past.length ? (
        <details className="mt-2">
          <summary className="mx-1 cursor-pointer text-[13px] font-bold uppercase tracking-[0.08em] text-[#9CC3D6]">
            Past ({past.length})
          </summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {past.map((booking) => (
              <BookingRow
                key={bookingKey(booking)}
                booking={booking}
                currentUser={currentUser}
                isAdmin={isAdmin}
                isPast
                onOpenBooking={onOpenBooking}
                onDeleteBooking={onDeleteBooking}
              />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

export default MyBookings;
