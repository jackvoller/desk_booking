function getWeekdayLabel(dateString) {
  const [year, month, day] = (dateString ?? '').split('-').map(Number);
  if (!year || !month || !day) {
    return '-';
  }

  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function BookingTable({ bookings, deskNameById, onOpenBooking, onDeleteBooking, isAdmin }) {
  if (!bookings.length) {
    return <p className="mt-2 text-sm text-slate-500">None</p>;
  }

  return (
    <div className="mt-3">
      <div className="space-y-3 md:hidden">
        {bookings.map((booking) => (
          <article
            key={booking._id ?? `${booking.date}-${booking.deskId}-${booking.userId}`}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{booking.date}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{getWeekdayLabel(booking.date)}</p>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                {deskNameById[booking.deskId] ?? booking.deskId}
              </span>
            </div>

            {isAdmin ? (
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <p>
                  <span className="font-semibold text-slate-700">User:</span> {booking.username ?? '-'}
                </p>
                <p className="break-all">
                  <span className="font-semibold text-slate-700">Email:</span> {booking.email ?? '-'}
                </p>
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                onClick={() => onOpenBooking(booking)}
              >
                Open in Desk View
              </button>
              <button
                type="button"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                onClick={() => onDeleteBooking(booking)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Day</th>
              <th className="px-3 py-2">Desk</th>
              {isAdmin ? <th className="px-3 py-2">User</th> : null}
              {isAdmin ? <th className="px-3 py-2">Email</th> : null}
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr
                key={booking._id ?? `${booking.date}-${booking.deskId}-${booking.userId}`}
                className="rounded-lg bg-slate-50 text-sm text-slate-700"
              >
                <td className="rounded-l-lg px-3 py-3 font-medium text-slate-900">{booking.date}</td>
                <td className="px-3 py-3">{getWeekdayLabel(booking.date)}</td>
                <td className="px-3 py-3">{deskNameById[booking.deskId] ?? booking.deskId}</td>
                {isAdmin ? <td className="px-3 py-3">{booking.username ?? '-'}</td> : null}
                {isAdmin ? <td className="px-3 py-3">{booking.email ?? '-'}</td> : null}
                <td className="rounded-r-lg px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      onClick={() => onOpenBooking(booking)}
                    >
                      Open in Desk View
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                      onClick={() => onDeleteBooking(booking)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MyBookings({ bookings, deskNameById, isLoading, onOpenBooking, onDeleteBooking, isAdmin, onExportCsv }) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-5">
        <p className="text-sm text-slate-600">Loading your bookings...</p>
      </section>
    );
  }

  if (!bookings.length) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-5">
        <h3 className="text-lg font-semibold text-slate-900">{isAdmin ? 'All Bookings' : 'My Bookings'}</h3>
        <p className="mt-2 text-sm text-slate-600">
          {isAdmin ? 'There are no bookings yet.' : 'You have no bookings yet.'}
        </p>
      </section>
    );
  }

  const todayKey = getTodayDateKey();
  const upcomingBookings = bookings
    .filter((booking) => booking.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date) || a.deskId.localeCompare(b.deskId));
  const pastBookings = bookings
    .filter((booking) => booking.date < todayKey)
    .sort((a, b) => b.date.localeCompare(a.date) || a.deskId.localeCompare(b.deskId));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{isAdmin ? 'All Bookings' : 'My Bookings'}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {isAdmin
              ? 'View and manage all desk bookings across users.'
              : 'Open a booking in Desk View or remove it directly.'}
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-auto sm:py-1.5"
            onClick={onExportCsv}
          >
            Export to CSV
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-5">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Upcoming ({upcomingBookings.length})
          </h4>
          <BookingTable
            bookings={upcomingBookings}
            deskNameById={deskNameById}
            onOpenBooking={onOpenBooking}
            onDeleteBooking={onDeleteBooking}
            isAdmin={isAdmin}
          />
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Past ({pastBookings.length})
          </h4>
          <BookingTable
            bookings={pastBookings}
            deskNameById={deskNameById}
            onOpenBooking={onOpenBooking}
            onDeleteBooking={onDeleteBooking}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </section>
  );
}

export default MyBookings;
