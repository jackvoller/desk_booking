import { useCallback, useEffect, useMemo, useState } from 'react';
import BookingModal from './components/BookingModal';
import FloorPlan from './components/FloorPlan';
import MyBookings from './components/MyBookings';
import MonthlyCalendar from './components/MonthlyCalendar';
import { DESKS } from './config/floorPlanSchema';
import { api } from './utils/api';
import { addDays, isWeekendDate, isWithinAdvanceWindow, shiftMonth, todayDateString } from './utils/date';

const MAX_ADVANCE_DAYS = 30;
const TODAY = todayDateString();
const MAX_DATE = addDays(TODAY, MAX_ADVANCE_DAYS);
const CURRENT_MONTH = TODAY.slice(0, 7);
const MAX_CALENDAR_MONTH = shiftMonth(CURRENT_MONTH, 1);
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
  const [myBookings, setMyBookings] = useState([]);
  const [isMyBookingsLoading, setIsMyBookingsLoading] = useState(false);

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

  const loadMyBookings = useCallback(async () => {
    setIsMyBookingsLoading(true);
    try {
      const response = await api.getMyBookings();
      setMyBookings(response.bookings ?? []);
    } finally {
      setIsMyBookingsLoading(false);
    }
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

  useEffect(() => {
    if (!user) {
      return;
    }

    loadMyBookings().catch((apiError) => {
      setError(apiError.message);
    });
  }, [user, loadMyBookings]);

  const bookingCountToday = useMemo(() => bookings.length, [bookings]);
  const deskNameById = useMemo(() => {
    const mapping = {};
    DESKS.forEach((desk) => {
      mapping[desk.id] = desk.name;
    });
    return mapping;
  }, []);
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
      await Promise.all([loadBookings(selectedDate), loadMonthCounts(calendarMonth), loadMyBookings()]);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCalendarDateSelect = (date) => {
    clearNotices();

    if (!isWithinAdvanceWindow(date, MAX_ADVANCE_DAYS)) {
      setError(`You can only book from today up to ${MAX_ADVANCE_DAYS} days in advance.`);
      return;
    }

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
    setMyBookings([]);
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

  const handleOpenMyBooking = (booking) => {
    clearNotices();
    setSelectedDate(booking.date);
    setCalendarMonth(booking.date.slice(0, 7));
    setPendingAction(null);
    setActiveView('desk');
  };

  const handleDeleteMyBooking = async (booking) => {
    clearNotices();

    const deskLabel = deskNameById[booking.deskId] ?? booking.deskId;
    const shouldDelete = window.confirm(`Remove your booking for ${deskLabel} on ${booking.date}?`);
    if (!shouldDelete) {
      return;
    }

    try {
      await api.deleteBooking(booking.deskId, booking.date);
      setSuccess(`${deskLabel} booking removed for ${booking.date}.`);

      const refreshTasks = [loadMonthCounts(calendarMonth), loadMyBookings()];
      if (booking.date === selectedDate) {
        refreshTasks.push(loadBookings(selectedDate));
      }

      await Promise.all(refreshTasks);
    } catch (apiError) {
      setError(apiError.message);
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
      <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0A4A6A] px-4 py-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(140deg,#0A4A6A_0%,#1F67A5_50%,#70BCD2_100%)]" />
          <div className="absolute -left-28 top-0 h-80 w-80 rounded-br-[220px] bg-[#73BED4]/75" />
          <div className="absolute right-[-140px] top-[-80px] h-[420px] w-[420px] rounded-full border-[80px] border-[#3B79B8]/80" />
          <div className="absolute bottom-[-180px] left-[-120px] h-[420px] w-[420px] rounded-full bg-[#44B2CC]/75" />
          <div className="absolute bottom-[-120px] right-[-160px] h-[360px] w-[360px] rounded-full bg-[#3B79B8]/80" />
        </div>

        <section className="relative z-10 w-full max-w-[46rem] overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-2xl backdrop-blur-sm">
          <div className="grid md:grid-cols-[285px_1fr]">
            <aside className="relative min-h-[190px] overflow-hidden bg-[#80AFC7] md:min-h-full">
              <div className="absolute inset-0">
                <div className="absolute inset-x-0 top-0 h-[29%] bg-[#6BB4CD]" />
                <div className="absolute inset-x-0 top-[29%] h-[19%] bg-[#3C79B7]" />
                <div className="absolute inset-x-0 top-[48%] h-[25%] bg-[#1F66A7]" />
                <div className="absolute inset-x-0 bottom-0 h-[27%] bg-[#6AB5CF]" />
                <div className="absolute right-0 top-0 h-[64%] w-[43%] bg-[#0A4A6A]" />
                <div className="absolute right-[-37%] top-[20%] h-52 w-52 rounded-full bg-[#4B76B1]" />
                <div className="absolute right-[-66%] top-[31%] h-56 w-56 rounded-full border-[48px] border-[#6CB7D0]" />
                <div className="absolute left-0 top-[48%] h-[25%] w-full bg-[linear-gradient(140deg,#1F66A7_0%,#1F66A7_50%,#3C79B7_50%,#3C79B7_100%)]" />
                <div className="absolute bottom-0 left-0 h-[27%] w-full bg-[linear-gradient(140deg,#6AB5CF_0%,#6AB5CF_46%,#3CB3CE_46%,#3CB3CE_68%,#6AB5CF_68%,#6AB5CF_100%)]" />
                <div className="absolute bottom-0 right-0 h-[27%] w-[56%] bg-[linear-gradient(140deg,#6AB5CF_0%,#6AB5CF_55%,#3B79B8_55%,#3B79B8_100%)]" />
                <div className="absolute left-[18%] top-[64%] h-14 w-14 rounded-full bg-white/90" />
                <div className="absolute bottom-[7%] right-[11%] h-16 w-16 rounded-full bg-[#1B66A8]" />
              </div>
              <div className="absolute bottom-6 left-6 text-white/70">
                <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
                  <rect x="8" y="8" width="48" height="34" rx="6" fill="none" stroke="currentColor" strokeWidth="4" />
                  <line x1="32" y1="42" x2="32" y2="53" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  <line x1="20" y1="56" x2="44" y2="56" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <div className="mt-2 h-1.5 w-20 rounded-full bg-white/85" />
              </div>
            </aside>

            <div className="p-6 sm:p-8 md:p-9">
              <div className="w-full">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#4A76B1]">Workspace Management</p>
                <h1 className="mt-4 text-3xl font-semibold leading-[1.1] text-[#1F4770] sm:text-4xl">
                  Your desk is
                  <span className="block text-[#4A76B1]">waiting.</span>
                </h1>
                <p className="mt-5 max-w-[42ch] text-base leading-relaxed text-[#5D708B] sm:text-[1.1rem]">
                  Reserve your spot at the Silverfin UK office and
                  <br className="hidden md:block" /> collaborate with your team in person.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#d8dee7] bg-[#f2f4f8] px-4 py-2 text-sm font-semibold text-[#40526b]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#4A76B1]" aria-hidden="true">
                      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
                      <line x1="3.5" y1="10" x2="20.5" y2="10" stroke="currentColor" strokeWidth="2" />
                      <line x1="8" y1="3.5" x2="8" y2="7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <line x1="16" y1="3.5" x2="16" y2="7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Instant Booking
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#d8dee7] bg-[#f2f4f8] px-4 py-2 text-sm font-semibold text-[#40526b]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#4A76B1]" aria-hidden="true">
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
                    className="mt-7 inline-flex h-14 w-full items-center justify-center rounded-full border border-[#d3dbe6] bg-white px-8 shadow-sm transition hover:bg-slate-50"
                    onClick={api.loginWithSlack}
                    aria-label="Sign in with Slack"
                  >
                    <span className="inline-flex items-center justify-center gap-4">
                      <span className="relative inline-block h-7 w-7 overflow-hidden" aria-hidden="true">
                        <img src="/slack.png" alt="" className="h-7 w-[76px] max-w-none" />
                      </span>
                      <span className="text-xl font-semibold leading-none text-[#111827]">Sign in with Slack</span>
                    </span>
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
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#3B79B8]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[#3B79B8]" />
        <div className="absolute left-0 top-0 h-[32%] w-[44%] bg-[#6BB4CD]" />
        <div className="absolute left-0 top-[32%] h-[18%] w-[44%] bg-[#3C79B7]" />
        <div className="absolute left-0 top-[50%] h-[24%] w-[44%] bg-[#1F66A7]" />
        <div className="absolute left-0 bottom-0 h-[26%] w-full bg-[#6AB5CF]" />
        <div className="absolute right-0 top-0 h-[52%] w-[52%] bg-[#0A4A6A]/70" />
        <div className="absolute right-[-10%] top-[10%] h-[48vh] w-[48vh] rounded-full bg-[#4B76B1]/90" />
        <div className="absolute right-[-25%] top-[18%] h-[56vh] w-[56vh] rounded-full border-[8vh] border-[#6CB7D0]/90" />
        <div className="absolute left-0 top-[50%] h-[24%] w-full bg-[linear-gradient(140deg,#1F66A7_0%,#1F66A7_46%,#3C79B7_46%,#3C79B7_100%)]" />
        <div className="absolute left-0 bottom-0 h-[26%] w-full bg-[linear-gradient(140deg,#6AB5CF_0%,#6AB5CF_50%,#3CB3CE_50%,#3CB3CE_74%,#6AB5CF_74%,#6AB5CF_100%)]" />
        <div className="absolute right-0 bottom-0 h-[26%] w-[54%] bg-[linear-gradient(140deg,#6AB5CF_0%,#6AB5CF_56%,#3B79B8_56%,#3B79B8_100%)]" />
        <div className="absolute left-[8%] top-[61%] h-20 w-20 rounded-full bg-white/90" />
        <div className="absolute bottom-[10%] right-[12%] h-24 w-24 rounded-full bg-[#1B66A8]/95" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
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
            <button
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeView === 'myBookings'
                  ? 'bg-white text-[#0D0E20] shadow'
                  : 'text-slate-600 hover:text-[#0D0E20]'
              }`}
              onClick={() => setActiveView('myBookings')}
            >
              My Bookings
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
      ) : activeView === 'calendar' ? (
        <section className="mt-4">
          <MonthlyCalendar
            month={calendarMonth}
            dayCounts={dayCounts}
            totalDesks={DESKS.length}
            onMonthChange={setCalendarMonth}
            onDateSelect={handleCalendarDateSelect}
            minDate={TODAY}
            maxDate={MAX_DATE}
            minMonth={CURRENT_MONTH}
            maxMonth={MAX_CALENDAR_MONTH}
          />
        </section>
      ) : (
        <section className="mt-4">
          <MyBookings
            bookings={myBookings}
            deskNameById={deskNameById}
            isLoading={isMyBookingsLoading}
            onOpenBooking={handleOpenMyBooking}
            onDeleteBooking={handleDeleteMyBooking}
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
      </div>
    </main>
  );
}

export default App;
