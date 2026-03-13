function BookingModal({ desk, date, mode, bookedBy, onCancel, onConfirm, isSubmitting }) {
  if (!desk || !mode) {
    return null;
  }

  const isUnbook = mode === 'unbook';
  const title = isUnbook ? 'Remove Booking' : 'Confirm Booking';
  const buttonLabel = isUnbook ? 'Remove Booking' : 'Confirm Booking';
  const buttonClass = isUnbook
    ? 'rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60'
    : 'rounded-lg bg-[#007AB7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#04588C] disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-3 text-slate-700">
          {isUnbook ? (
            <>
              Remove booking for <span className="font-semibold">{desk.name}</span> on{' '}
              <span className="font-semibold">{date}</span>?
            </>
          ) : (
            <>
              Book <span className="font-semibold">{desk.name}</span> for{' '}
              <span className="font-semibold">{date}</span>?
            </>
          )}
        </p>
        {isUnbook && bookedBy ? (
          <p className="mt-2 text-xs text-slate-500">Currently booked by: {bookedBy}</p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingModal;
