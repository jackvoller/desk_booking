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

function SlackLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#36C5F0"
        d="M9.72 3a2.28 2.28 0 1 1-4.56 0 2.28 2.28 0 0 1 4.56 0Zm0 1.38v5.7a2.28 2.28 0 1 1-4.56 0v-5.7h4.56Z"
      />
      <path
        fill="#2EB67D"
        d="M21 9.72a2.28 2.28 0 1 1 0-4.56 2.28 2.28 0 0 1 0 4.56Zm-1.38 0h-5.7a2.28 2.28 0 1 1 0-4.56h5.7v4.56Z"
      />
      <path
        fill="#ECB22E"
        d="M14.28 21a2.28 2.28 0 1 1 4.56 0 2.28 2.28 0 0 1-4.56 0Zm0-1.38v-5.7a2.28 2.28 0 1 1 4.56 0v5.7h-4.56Z"
      />
      <path
        fill="#E01E5A"
        d="M3 14.28a2.28 2.28 0 1 1 0 4.56 2.28 2.28 0 0 1 0-4.56Zm1.38 0h5.7a2.28 2.28 0 1 1 0 4.56h-5.7v-4.56Z"
      />
    </svg>
  );
}

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
      <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#d7e2ea] px-4 py-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-120px] top-[-140px] h-72 w-72 rounded-full bg-[#9fcfe0]/55" />
          <div className="absolute right-[-100px] top-[-80px] h-72 w-72 rounded-full bg-[#8baec6]/45" />
          <div className="absolute bottom-[-140px] left-[15%] h-80 w-80 rounded-full bg-[#99bfd2]/40" />
        </div>

        <section className="relative z-10 w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 shadow-2xl backdrop-blur-sm">
          <div className="grid md:grid-cols-[34%_66%]">
            <aside className="relative min-h-[260px] overflow-hidden bg-[#80AFC7] md:min-h-full">
              <div className="absolute inset-0">
                <div className="absolute inset-x-0 top-0 h-[38%] bg-[#85B2CA]" />
                <div className="absolute bottom-0 left-0 h-[37%] w-full bg-[#4a79b5]" />
                <div className="absolute bottom-0 right-0 h-[70%] w-[50%] bg-[#1f4770]" />
                <div className="absolute right-[-16%] top-[24%] h-64 w-64 rounded-full bg-[#4a76b1]" />
                <div className="absolute bottom-[2%] right-[12%] h-28 w-28 rounded-full bg-[#98bccd]" />
                <div className="absolute bottom-0 left-0 h-[34%] w-[50%] bg-[#214a73]" />
              </div>
              <div className="absolute bottom-9 left-9 text-white/70">
                <svg viewBox="0 0 64 64" className="h-10 w-10" aria-hidden="true">
                  <rect x="8" y="8" width="48" height="34" rx="6" fill="none" stroke="currentColor" strokeWidth="4" />
                  <line x1="32" y1="42" x2="32" y2="53" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  <line x1="20" y1="56" x2="44" y2="56" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <div className="mt-3 h-2 w-24 rounded-full bg-white/85" />
              </div>
            </aside>

            <div className="p-6 sm:p-10 md:p-14">
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#4A76B1]">Workspace Management</p>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.05] text-[#1F4770] sm:text-5xl lg:text-6xl">
                Your desk is
                <span className="block text-[#4A76B1]">waiting.</span>
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[#5D708B] sm:text-2xl">
                Reserve your spot at the Silverfin UK office and collaborate with your team in person.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-3 rounded-full border border-[#d8dee7] bg-[#f2f4f8] px-6 py-3 text-[1.02rem] font-semibold text-[#40526b]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#4A76B1]" aria-hidden="true">
                    <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
                    <line x1="3.5" y1="10" x2="20.5" y2="10" stroke="currentColor" strokeWidth="2" />
                    <line x1="8" y1="3.5" x2="8" y2="7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="16" y1="3.5" x2="16" y2="7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Instant Booking
                </span>
                <span className="inline-flex items-center gap-3 rounded-full border border-[#d8dee7] bg-[#f2f4f8] px-6 py-3 text-[1.02rem] font-semibold text-[#40526b]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#4A76B1]" aria-hidden="true">
                    <circle cx="9" cy="9" r="3.25" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="17.2" cy="10.5" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M15 18.8c.3-2.1 1.5-3.5 3.7-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Team Presence
                </span>
              </div>

              {error && <p className="mt-5 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>}

              {authProviders.slack ? (
                <button
                  type="button"
                  className="mt-10 flex w-full items-center justify-between rounded-3xl bg-[#1F4770] px-6 py-5 text-left text-white transition hover:bg-[#17385a]"
                  onClick={api.loginWithSlack}
                >
                  <span className="inline-flex items-center gap-4">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                      <SlackLogo />
                    </span>
                    <span className="text-xl font-semibold leading-none sm:text-[2rem]">Continue with Slack</span>
                  </span>
                  <span className="text-4xl font-light leading-none sm:text-5xl">→</span>
                </button>
              ) : !authProviders.devLogin ? (
                <p className="mt-5 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-700">
                  No sign-in method is configured. Contact your administrator.
                </p>
              ) : null}

              {authProviders.devLogin ? (
                <form className="mt-6 space-y-3" onSubmit={handleDevLogin}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#3C6283]">Quick local access</p>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={devUsername}
                    onChange={(event) => setDevUsername(event.target.value)}
                    className="w-full rounded-lg border border-[#9FCFDD] bg-white px-3 py-2 text-sm text-[#0D2440] placeholder:text-[#4C6A85] focus:border-[#1F67A5] focus:outline-none focus:ring-2 focus:ring-[#70BCD2]/40"
                    maxLength={80}
                  />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={devEmail}
                    onChange={(event) => setDevEmail(event.target.value)}
                    className="w-full rounded-lg border border-[#9FCFDD] bg-white px-3 py-2 text-sm text-[#0D2440] placeholder:text-[#4C6A85] focus:border-[#1F67A5] focus:outline-none focus:ring-2 focus:ring-[#70BCD2]/40"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-[#1F67A5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A4A6A] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isDevLoggingIn}
                  >
                    {isDevLoggingIn ? 'Signing in...' : 'Continue with Dev Login'}
                  </button>
                </form>
              ) : null}

              {showAuthProviderDebug ? (
                <p className="mt-4 rounded-lg bg-[#E8F5FA] px-3 py-2 text-xs font-medium text-[#3C6283]">
                  Auth providers: dev={String(authProviders.devLogin)}, slack={String(authProviders.slack)}, google=
                  {String(authProviders.google)}
                </p>
              ) : null}
            </div>
          </div>
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
