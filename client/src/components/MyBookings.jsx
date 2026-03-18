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

function BookingTable({ bookings, deskNameById, onOpenBooking, onDeleteBooking }) {
  if (!bookings.length) {
    return <p className="mt-2 text-sm text-slate-500">None</p>;
  }

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Day</th>
            <th className="px-3 py-2">Desk</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={`${booking.date}-${booking.deskId}`} className="rounded-lg bg-slate-50 text-sm text-slate-700">
              <td className="rounded-l-lg px-3 py-3 font-medium text-slate-900">{booking.date}</td>
              <td className="px-3 py-3">{getWeekdayLabel(booking.date)}</td>
              <td className="px-3 py-3">{deskNameById[booking.deskId] ?? booking.deskId}</td>
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
  );
}

function MyBookings({ bookings, deskNameById, isLoading, onOpenBooking, onDeleteBooking }) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
        <p className="text-sm text-slate-600">Loading your bookings...</p>
      </section>
    );
  }

  if (!bookings.length) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900">My Bookings</h3>
        <p className="mt-2 text-sm text-slate-600">You have no bookings yet.</p>
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
      <h3 className="text-lg font-semibold text-slate-900">My Bookings</h3>
      <p className="mt-1 text-sm text-slate-600">Open a booking in Desk View or remove it directly.</p>

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
          />
        </div>
      </div>
    </section>
  );
}

export default MyBookings;
