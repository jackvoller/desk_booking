import { useCallback, useEffect, useMemo, useState } from 'react';
import BookingModal from './components/BookingModal';
import FloorPlan from './components/FloorPlan';
import MonthlyCalendar from './components/MonthlyCalendar';
import { DESKS } from './config/floorPlanSchema';
import { api } from './utils/api';
import { addDays, isWeekendDate, isWithinAdvanceWindow, todayDateString } from './utils/date';

const MAX_ADVANCE_DAYS = 30;
const TODAY = todayDateString();
const MAX_DATE = addDays(TODAY, MAX_ADVANCE_DAYS);
const DEFAULT_AUTH_PROVIDERS = {
  devLogin: true,
  slack: false,
  google: false
};

function findNearestWeekday(dateString, dayOffset) {
  const step = dayOffset >= 0 ? 1 : -1;
  let candidate = addDays(dateString, dayOffset);

  while (isWithinAdvanceWindow(candidate, MAX_ADVANCE_DAYS) && isWeekendDate(candidate)) {
    candidate = addDays(candidate, step);
  }

  if (!isWithinAdvanceWindow(candidate, MAX_ADVANCE_DAYS) || isWeekendDate(candidate)) {
    return null;
  }

  return candidate;
}

function App() {
  const [user, setUser] = useState(null);
  const [authProviders, setAuthProviders] = useState(DEFAULT_AUTH_PROVIDERS);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState('desk');

  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [calendarMonth, setCalendarMonth] = useState(TODAY.slice(0, 7));

  const [bookings, setBookings] = useState([]);
  const [dayCounts, setDayCounts] = useState({});

  const [pendingAction, setPendingAction] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devUsername, setDevUsername] = useState('');
  const [devEmail, setDevEmail] = useState('');
  const [isDevLoggingIn, setIsDevLoggingIn] = useState(false);
  const showAuthProviderDebug = import.meta.env.DEV;

  const clearNotices = () => {
    setError('');
    setSuccess('');
  };

  const loadBookings = useCallback(async (date) => {
    const response = await api.getBookingsByDate(date);
    setBookings(response.bookings ?? []);
  }, []);

  const loadMonthCounts = useCallback(async (month) => {
    const response = await api.getMonthlyCounts(month);
    const nextDayCounts = {};
    (response.counts ?? []).forEach((entry) => {
      nextDayCounts[entry.date] = entry.count;
    });
    setDayCounts(nextDayCounts);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('authError');
    if (authError) {
      const errorMessages = {
        google: 'Google sign-in failed. Please try again.',
        googleDisabled: 'Google sign-in is not enabled for this environment.',
        slackDisabled: 'Slack sign-in is not enabled for this environment.',
        slackDenied: 'Slack sign-in was cancelled.',
        slackState: 'Slack sign-in session expired. Please try again.',
        slackToken: 'Unable to complete Slack sign-in. Please try again.',
        slackProfile: 'Could not read your Slack profile. Please try again.',
        slackWorkspace: 'You must sign in with an approved Slack workspace or enterprise org.'
      };

      setError(errorMessages[authError] || 'Sign-in failed. Please try again.');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth() {
      try {
        const response = await api.getCurrentUser();
        if (isMounted) {
          setUser(response.user ?? null);
          setAuthProviders(response.authProviders ?? DEFAULT_AUTH_PROVIDERS);
        }
      } catch (_apiError) {
        if (isMounted) {
          setUser(null);
          setAuthProviders(DEFAULT_AUTH_PROVIDERS);
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    }

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    loadBookings(selectedDate).catch((apiError) => {
      setError(apiError.message);
    });
  }, [user, selectedDate, loadBookings]);

  useEffect(() => {
    if (!user) {
      return;
    }

    loadMonthCounts(calendarMonth).catch((apiError) => {
      setError(apiError.message);
    });
  }, [user, calendarMonth, loadMonthCounts]);

  const bookingCountToday = useMemo(() => bookings.length, [bookings]);
  const previousDate = findNearestWeekday(selectedDate, -1);
  const nextDate = findNearestWeekday(selectedDate, 1);
  const canGoPreviousDate = Boolean(previousDate);
  const canGoNextDate = Boolean(nextDate);
  const showDateStepper = activeView === 'desk';

  const handleDateChange = (event) => {
    const nextDate = event.target.value;
    if (!nextDate) {
      return;
    }

    clearNotices();

    if (!isWithinAdvanceWindow(nextDate, MAX_ADVANCE_DAYS)) {
      setError(`You can only book from today up to ${MAX_ADVANCE_DAYS} days in advance.`);
      return;
    }

    if (isWeekendDate(nextDate)) {
      setError('Weekend bookings are unavailable. Please choose a weekday.');
      return;
    }

    setSelectedDate(nextDate);
    setCalendarMonth(nextDate.slice(0, 7));
    setPendingAction(null);
  };

  const handleQuickDateShift = (dayOffset) => {
    const targetDate = findNearestWeekday(selectedDate, dayOffset);
    if (!targetDate) {
      return;
    }

    clearNotices();
    setSelectedDate(targetDate);
    setCalendarMonth(targetDate.slice(0, 7));
    setPendingAction(null);
  };

  const handleAvailableDeskClick = (desk) => {
    clearNotices();

    if (!isWithinAdvanceWindow(selectedDate, MAX_ADVANCE_DAYS)) {
      setError(`Bookings are limited to a ${MAX_ADVANCE_DAYS}-day window.`);
      return;
    }

    if (isWeekendDate(selectedDate)) {
      setError('Weekend bookings are unavailable. Please choose a weekday.');
      return;
    }

    setPendingAction({
      type: 'book',
      desk
    });
  };

  const handleBookedDeskClick = ({ desk, booking }) => {
    clearNotices();

    if (booking?.userId !== user?.id) {
      setError('You can only remove your own bookings.');
      return;
    }

    setPendingAction({
      type: 'unbook',
      desk,
      booking
    });
  };

  const handleConfirmDeskAction = async () => {
    if (!pendingAction?.desk) {
      return;
    }

    clearNotices();
    setIsSubmitting(true);

    try {
      if (pendingAction.type === 'unbook') {
        await api.deleteBooking(pendingAction.desk.id, selectedDate);
        setSuccess(`${pendingAction.desk.name} booking removed for ${selectedDate}.`);
      } else {
        await api.createBooking(pendingAction.desk.id, selectedDate);
        setSuccess(`${pendingAction.desk.name} is booked for ${selectedDate}.`);
      }

      setPendingAction(null);
      await Promise.all([loadBookings(selectedDate), loadMonthCounts(calendarMonth)]);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCalendarDateSelect = (date) => {
    clearNotices();

    if (isWeekendDate(date)) {
      setError('Weekend bookings are unavailable. Please choose a weekday.');
      return;
    }

    setSelectedDate(date);
    setCalendarMonth(date.slice(0, 7));
    setPendingAction(null);
    setActiveView('desk');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (_apiError) {
      // Ignore logout API failure and clear local state anyway.
    }

    setUser(null);
    setBookings([]);
    setDayCounts({});
    setPendingAction(null);
    setActiveView('desk');
  };

  const handleDevLogin = async (event) => {
    event.preventDefault();
    clearNotices();

    const username = devUsername.trim();
    const email = devEmail.trim().toLowerCase();

    if (!username || !email) {
      setError('Enter both a username and email for development login.');
      return;
    }

    setIsDevLoggingIn(true);
    try {
      const response = await api.devLogin(username, email);
      setUser(response.user ?? null);
      setDevUsername('');
      setDevEmail('');
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsDevLoggingIn(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-xl bg-white px-6 py-4 text-slate-700 shadow">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4">
        <section className="w-full rounded-3xl bg-white p-8 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#007AB7]">Desk Booking</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Book your Silverfin UK office desk now</h1>
          <p className="mt-3 text-slate-600">
            Sign in to view availability, reserve desks, and check monthly occupancy.
          </p>
          {error && <p className="mt-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>}

          {authProviders.devLogin ? (
            <form className="mt-6 space-y-3" onSubmit={handleDevLogin}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick local access</p>
              <input
                type="text"
                placeholder="Your name"
                value={devUsername}
                onChange={(event) => setDevUsername(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                maxLength={80}
              />
              <input
                type="email"
                placeholder="you@example.com"
                value={devEmail}
                onChange={(event) => setDevEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-[#007AB7] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#04588C] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDevLoggingIn}
              >
                {isDevLoggingIn ? 'Signing in...' : 'Continue with Dev Login'}
              </button>
            </form>
          ) : null}

          {authProviders.devLogin && authProviders.slack ? <div className="my-5 h-px w-full bg-slate-200" /> : null}

          {authProviders.slack ? (
            <button
              type="button"
              className="w-full rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={api.loginWithSlack}
            >
              Sign in with Slack
            </button>
          ) : !authProviders.devLogin ? (
            <p className="mt-5 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-700">
              No sign-in method is configured. Contact your administrator.
            </p>
          ) : null}

          {showAuthProviderDebug ? (
            <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
              Auth providers: dev={String(authProviders.devLogin)}, slack={String(authProviders.slack)}, google=
              {String(authProviders.google)}
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Desk Booking Dashboard</h1>
            <p className="text-sm text-slate-600">
              Signed in as <span className="font-semibold">{user.username}</span> ({user.email})
            </p>
          </div>
          <button
            type="button"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 md:w-auto"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex rounded-xl bg-[#eaeef1] p-1">
            <button
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeView === 'calendar'
                  ? 'bg-white text-[#0D0E20] shadow'
                  : 'text-slate-600 hover:text-[#0D0E20]'
              }`}
              onClick={() => setActiveView('calendar')}
            >
              Calendar View
            </button>
            <button
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeView === 'desk' ? 'bg-white text-[#0D0E20] shadow' : 'text-slate-600 hover:text-[#0D0E20]'
              }`}
              onClick={() => setActiveView('desk')}
            >
              Desk View
            </button>
          </div>

          {activeView === 'desk' ? (
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
              <label className="font-semibold" htmlFor="booking-date">
                Date
              </label>
              {showDateStepper ? (
                <button
                  type="button"
                  aria-label="Previous day"
                  disabled={!canGoPreviousDate}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => handleQuickDateShift(-1)}
                >
                  ←
                </button>
              ) : null}
              <input
                id="booking-date"
                type="date"
                value={selectedDate}
                min={TODAY}
                max={MAX_DATE}
                className="rounded-lg border border-slate-300 px-3 py-2"
                onChange={handleDateChange}
              />
              {showDateStepper ? (
                <button
                  type="button"
                  aria-label="Next day"
                  disabled={!canGoNextDate}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => handleQuickDateShift(1)}
                >
                  →
                </button>
              ) : null}
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {bookingCountToday}/{DESKS.length} desks booked
              </span>
            </div>
          ) : null}
        </div>
      </section>

      {error && <p className="mt-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="mt-4 rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      {activeView === 'desk' ? (
        <section className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="inline-flex items-center gap-2 text-sm text-slate-700">
              <span className="h-3 w-3 rounded-full bg-available" /> Available
            </div>
            <div className="inline-flex items-center gap-2 text-sm text-slate-700">
              <span className="h-3 w-3 rounded-full bg-booked" /> Booked
            </div>
            <div className="text-xs text-slate-500">
              Click a green desk to book. Click a red desk to remove the booking.
            </div>
          </div>

          <FloorPlan
            bookings={bookings}
            onAvailableDeskClick={handleAvailableDeskClick}
            onBookedDeskClick={handleBookedDeskClick}
          />
        </section>
      ) : (
        <section className="mt-4">
          <MonthlyCalendar
            month={calendarMonth}
            dayCounts={dayCounts}
            totalDesks={DESKS.length}
            onMonthChange={setCalendarMonth}
            onDateSelect={handleCalendarDateSelect}
          />
        </section>
      )}

      <BookingModal
        desk={pendingAction?.desk ?? null}
        date={selectedDate}
        mode={pendingAction?.type ?? null}
        bookedBy={pendingAction?.booking?.username ?? ''}
        onCancel={() => setPendingAction(null)}
        onConfirm={handleConfirmDeskAction}
        isSubmitting={isSubmitting}
      />
    </main>
  );
}

export default App;
