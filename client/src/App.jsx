import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppHeader, MobileTabBar } from './components/AppNav';
import BrandBackground from './components/BrandBackground';
import { BottomSheet, CARD, DeskDetails, InOfficeList, WeekStrip, YourDeskCard } from './components/DeskPanel';
import FloorPlan, { DESK_LOOK, LegendItem, getDeskStatus } from './components/FloorPlan';
import MyBookings from './components/MyBookings';
import MonthlyCalendar from './components/MonthlyCalendar';
import { DESKS, getDeskZone } from './config/floorPlanSchema';
import { api } from './utils/api';
import { isOwnBooking } from './utils/bookings';
import {
  addDays,
  formatLongDate,
  formatShortDate,
  getWorkWeek,
  isWeekendDate,
  isWithinAdvanceWindow,
  shiftMonth,
  todayDateString
} from './utils/date';

const MAX_ADVANCE_DAYS = 30;
const TODAY = todayDateString();
const MAX_DATE = addDays(TODAY, MAX_ADVANCE_DAYS);
const CURRENT_MONTH = TODAY.slice(0, 7);
const MAX_CALENDAR_MONTH = shiftMonth(CURRENT_MONTH, 1);
const DEFAULT_AUTH_PROVIDERS = {
  devLogin: true,
  slack: false,
  google: false,
  admin: false
};

function isBookableDate(dateString) {
  return isWithinAdvanceWindow(dateString, MAX_ADVANCE_DAYS) && !isWeekendDate(dateString);
}

function firstBookableDayOfWeek(dateString) {
  return getWorkWeek(dateString).find(isBookableDate) ?? null;
}

function App() {
  const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');
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

  const [selectedDeskId, setSelectedDeskId] = useState(null);
  const [bookingFor, setBookingFor] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devUsername, setDevUsername] = useState('');
  const [devEmail, setDevEmail] = useState('');
  const [isDevLoggingIn, setIsDevLoggingIn] = useState(false);
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);
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

  const loadAllBookings = useCallback(async () => {
    setIsMyBookingsLoading(true);
    try {
      const response = await api.getAllBookings();
      setMyBookings(response.bookings ?? []);
    } finally {
      setIsMyBookingsLoading(false);
    }
  }, []);

  const refreshBookingsList = useCallback(async () => {
    if (!user) {
      return;
    }

    if (user.isAdmin) {
      await loadAllBookings();
      return;
    }

    await loadMyBookings();
  }, [user, loadAllBookings, loadMyBookings]);

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

    refreshBookingsList().catch((apiError) => {
      setError(apiError.message);
    });
  }, [user, refreshBookingsList]);

  const bookingCountToday = bookings.length;
  const freeDeskCount = Math.max(0, DESKS.length - bookingCountToday);
  const myBookingForSelectedDate = useMemo(
    () => bookings.find((booking) => isOwnBooking(booking, user)) ?? null,
    [bookings, user]
  );

  const deskNameById = useMemo(() => {
    const mapping = {};
    DESKS.forEach((desk) => {
      mapping[desk.id] = desk.name;
    });
    return mapping;
  }, []);

  // Days you're booked in, for the dots on the week strip.
  const myBookedDates = useMemo(() => {
    const dates = new Set();
    myBookings.forEach((booking) => {
      if (isOwnBooking(booking, user)) {
        dates.add(booking.date);
      }
    });
    if (myBookingForSelectedDate) {
      dates.add(selectedDate);
    }
    return dates;
  }, [myBookings, user, myBookingForSelectedDate, selectedDate]);

  const weekDays = useMemo(
    () =>
      getWorkWeek(selectedDate).map((date) => ({
        date,
        disabled: !isBookableDate(date),
        hasMine: myBookedDates.has(date),
        count: date === selectedDate ? bookingCountToday : date.startsWith(calendarMonth) ? dayCounts[date] ?? 0 : null
      })),
    [selectedDate, myBookedDates, bookingCountToday, calendarMonth, dayCounts]
  );
  const previousWeekDate = firstBookableDayOfWeek(addDays(selectedDate, -7));
  const nextWeekDate = firstBookableDayOfWeek(addDays(selectedDate, 7));

  const selectedBooking = selectedDeskId ? bookings.find((booking) => booking.deskId === selectedDeskId) ?? null : null;
  const selectedStatus = getDeskStatus(selectedBooking, user);
  const peopleInOffice = useMemo(
    () =>
      [...bookings]
        .sort((a, b) => a.deskId.localeCompare(b.deskId))
        .map((booking) => ({
          deskId: booking.deskId,
          name: booking.username ?? '',
          isMe: isOwnBooking(booking, user)
        })),
    [bookings, user]
  );

  const goToDate = (date) => {
    if (!date) {
      return;
    }

    clearNotices();
    setSelectedDate(date);
    setCalendarMonth(date.slice(0, 7));
    setSelectedDeskId(null);
    setBookingFor('');
  };

  const handleSelectDesk = (deskId) => {
    clearNotices();
    setBookingFor('');
    setSelectedDeskId((current) => (current === deskId ? null : deskId));
  };

  const closeDeskDetails = useCallback(() => {
    setSelectedDeskId(null);
    setBookingFor('');
  }, []);

  const refreshAfterChange = () =>
    Promise.all([loadBookings(selectedDate), loadMonthCounts(calendarMonth), refreshBookingsList()]);

  const handleBookSelectedDesk = async () => {
    const deskId = selectedDeskId;
    if (!deskId) {
      return;
    }

    clearNotices();

    if (!isBookableDate(selectedDate)) {
      setError(`You can only book weekdays from today up to ${MAX_ADVANCE_DAYS} days ahead.`);
      return;
    }

    setIsSubmitting(true);
    const dayLabel = formatLongDate(selectedDate);

    try {
      const existing = !user?.isAdmin ? myBookingForSelectedDate : null;

      if (existing && existing.deskId !== deskId) {
        // One desk per day: moving means giving up the old desk first.
        await api.deleteBooking(existing.deskId, selectedDate);
        try {
          await api.createBooking(deskId, selectedDate);
        } catch (createError) {
          await api.createBooking(existing.deskId, selectedDate).catch(() => {});
          throw createError;
        }
        setSuccess(`Moved you from ${existing.deskId} to ${deskId} for ${dayLabel}`);
      } else {
        const guestName = user?.isAdmin ? bookingFor.trim() : '';
        await api.createBooking(deskId, selectedDate, guestName);
        setSuccess(guestName ? `Desk ${deskId} booked for ${guestName} on ${dayLabel}` : `Desk ${deskId} is yours for ${dayLabel}`);
      }

      setSelectedDeskId(null);
      setBookingFor('');
      await refreshAfterChange();
    } catch (apiError) {
      setError(apiError.message);
      await loadBookings(selectedDate).catch(() => {});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveDeskBooking = async (deskId) => {
    if (!deskId) {
      return;
    }

    clearNotices();
    setIsSubmitting(true);

    try {
      await api.deleteBooking(deskId, selectedDate);
      setSuccess(`Booking for ${deskId} on ${formatLongDate(selectedDate)} cancelled`);
      setSelectedDeskId(null);
      await refreshAfterChange();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success messages fade on their own; errors stay until dismissed.
  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer = window.setTimeout(() => setSuccess(''), 4000);
    return () => window.clearTimeout(timer);
  }, [success]);

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
    setSelectedDeskId(null);
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
    setSelectedDeskId(null);
    setActiveView('desk');
    setAdminPassword('');
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

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    clearNotices();

    const username = adminUsername.trim();
    const password = adminPassword;

    if (!username || !password) {
      setError('Enter both admin username and password.');
      return;
    }

    setIsAdminLoggingIn(true);
    try {
      const response = await api.adminLogin(username, password);
      setUser(response.user ?? null);
      setAdminPassword('');
      setActiveView('desk');
      setSuccess('Signed in as admin.');
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  const handleOpenMyBooking = (booking) => {
    clearNotices();
    setSelectedDate(booking.date);
    setCalendarMonth(booking.date.slice(0, 7));
    setSelectedDeskId(booking.deskId);
    setBookingFor('');
    setActiveView('desk');
  };

  const handleDeleteMyBooking = async (booking) => {
    clearNotices();

    const deskLabel = deskNameById[booking.deskId] ?? booking.deskId;
    const prompt = user?.isAdmin
      ? `Remove booking for ${deskLabel} on ${booking.date}${booking.username ? ` (booked by ${booking.username})` : ''}?`
      : `Remove your booking for ${deskLabel} on ${booking.date}?`;
    const shouldDelete = window.confirm(prompt);
    if (!shouldDelete) {
      return;
    }

    try {
      await api.deleteBooking(booking.deskId, booking.date);
      setSuccess(`${deskLabel} booking removed for ${booking.date}.`);

      const refreshTasks = [loadMonthCounts(calendarMonth), refreshBookingsList()];
      if (booking.date === selectedDate) {
        refreshTasks.push(loadBookings(selectedDate));
      }

      await Promise.all(refreshTasks);
    } catch (apiError) {
      setError(apiError.message);
    }
  };

  const handleExportBookingsCsv = () => {
    clearNotices();

    if (!user?.isAdmin) {
      setError('Admin access required.');
      return;
    }

    if (!myBookings.length) {
      setError('No bookings to export.');
      return;
    }

    const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const getWeekday = (dateString) => {
      const [year, month, day] = (dateString ?? '').split('-').map(Number);
      if (!year || !month || !day) {
        return '';
      }
      return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: 'short' });
    };

    const rows = [...myBookings].sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.deskId.localeCompare(b.deskId) ||
        (a.username ?? '').localeCompare(b.username ?? '')
    );

    const header = ['Date', 'Day', 'Desk ID', 'Desk Name', 'Username', 'Email', 'User ID', 'Created At', 'Updated At'];
    const dataLines = rows.map((booking) =>
      [
        booking.date,
        getWeekday(booking.date),
        booking.deskId,
        deskNameById[booking.deskId] ?? booking.deskId,
        booking.username ?? '',
        booking.email ?? '',
        booking.userId ?? '',
        booking.createdAt ?? '',
        booking.updatedAt ?? ''
      ]
        .map(csvEscape)
        .join(',')
    );

    const csv = [header.join(','), ...dataLines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `all-bookings-${todayDateString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
    setSuccess('All bookings exported to CSV.');
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-xl bg-white px-6 py-4 text-slate-700 shadow">Loading...</div>
      </div>
    );
  }

  if (isAdminRoute && !user?.isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <BrandBackground />
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-slate-900">Admin Access</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in with the admin username and password.</p>

          {error ? <p className="mt-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="mt-4 rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

          {user && !user.isAdmin ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Currently signed in as {user.username}. Admin credentials are required for this page.
            </div>
          ) : null}

          {!authProviders.admin ? (
            <p className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-700">
              Admin login is not configured on the server yet.
            </p>
          ) : (
            <form className="mt-4 space-y-3" onSubmit={handleAdminLogin}>
              <input
                type="text"
                value={adminUsername}
                onChange={(event) => setAdminUsername(event.target.value)}
                placeholder="admin"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#007AB7] focus:outline-none focus:ring-2 focus:ring-[#13C5E2]/40"
                autoComplete="username"
              />
              <input
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                placeholder="Password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#007AB7] focus:outline-none focus:ring-2 focus:ring-[#13C5E2]/40"
                autoComplete="current-password"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isAdminLoggingIn}
              >
                {isAdminLoggingIn ? 'Signing in...' : 'Sign in as Admin'}
              </button>
            </form>
          )}

          {user && !user.isAdmin ? (
            <button
              type="button"
              className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={handleLogout}
            >
              Logout current user
            </button>
          ) : null}
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-8">
        <BrandBackground />

        <section className="relative z-10 w-full max-w-[46rem] overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="grid md:grid-cols-[285px_1fr]">
            <aside className="relative min-h-[190px] overflow-hidden bg-sfNavy md:min-h-full">
              <BrandBackground contained />
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
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#007AB7]">Workspace Management</p>
                <h1 className="mt-4 text-3xl font-bold leading-[1.1] text-sfNavy sm:text-4xl">
                  Your desk is
                  <span className="block text-[#007AB7]">waiting.</span>
                </h1>
                <p className="mt-5 max-w-[42ch] text-base leading-relaxed text-[#4A5568] sm:text-[1.1rem]">
                  Reserve your spot at the Silverfin UK office and
                  <br className="hidden md:block" /> collaborate with your team in person.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#d8dee7] bg-[#f2f4f8] px-4 py-2 text-sm font-semibold text-[#334155]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#007AB7]" aria-hidden="true">
                      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
                      <line x1="3.5" y1="10" x2="20.5" y2="10" stroke="currentColor" strokeWidth="2" />
                      <line x1="8" y1="3.5" x2="8" y2="7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <line x1="16" y1="3.5" x2="16" y2="7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Instant Booking
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#d8dee7] bg-[#f2f4f8] px-4 py-2 text-sm font-semibold text-[#334155]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#007AB7]" aria-hidden="true">
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
                    className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full border border-[#d3dbe6] bg-white px-6 shadow-sm transition hover:bg-slate-50"
                    onClick={api.loginWithSlack}
                    aria-label="Sign in with Slack"
                  >
                    <span className="inline-flex items-center justify-center gap-3">
                      <img src="/slack-logo.png" alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
                      <span className="text-base font-semibold leading-none text-[#111827]">Sign in with Slack</span>
                    </span>
                  </button>
                ) : !authProviders.devLogin ? (
                  <p className="mt-5 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-700">
                    No sign-in method is configured. Contact your administrator.
                  </p>
                ) : null}

                {authProviders.devLogin ? (
                  <form className="mt-6 space-y-3" onSubmit={handleDevLogin}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#04588C]">Quick local access</p>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={devUsername}
                      onChange={(event) => setDevUsername(event.target.value)}
                      className="w-full rounded-lg border border-[#C5D7E2] bg-white px-3 py-2 text-sm text-sfNavy placeholder:text-[#5B6475] focus:border-[#007AB7] focus:outline-none focus:ring-2 focus:ring-[#13C5E2]/40"
                      maxLength={80}
                    />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={devEmail}
                      onChange={(event) => setDevEmail(event.target.value)}
                      className="w-full rounded-lg border border-[#C5D7E2] bg-white px-3 py-2 text-sm text-sfNavy placeholder:text-[#5B6475] focus:border-[#007AB7] focus:outline-none focus:ring-2 focus:ring-[#13C5E2]/40"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-[#04588C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-sfNavy disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isDevLoggingIn}
                    >
                      {isDevLoggingIn ? 'Signing in...' : 'Continue with Dev Login'}
                    </button>
                  </form>
                ) : null}

                {showAuthProviderDebug ? (
                  <p className="mt-4 rounded-lg bg-[#E8F8FC] px-3 py-2 text-xs font-medium text-[#04588C]">
                    Auth providers: dev={String(authProviders.devLogin)}, slack={String(authProviders.slack)}, google=
                    {String(authProviders.google)}, admin={String(authProviders.admin)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const changeView = (view) => {
    clearNotices();
    setSelectedDeskId(null);
    setActiveView(view);
  };

  const shortDateLabel = formatShortDate(selectedDate);
  const deskStatusLine = user.isAdmin
    ? `${bookingCountToday} of ${DESKS.length} desks booked`
    : myBookingForSelectedDate
      ? `You're at ${myBookingForSelectedDate.deskId} · ${getDeskZone(myBookingForSelectedDate.deskId)}`
      : `No desk yet · ${freeDeskCount} free`;

  const deskDetailsProps = {
    deskId: selectedDeskId,
    booking: selectedBooking,
    status: selectedStatus,
    dateLabel: shortDateLabel,
    isAdmin: Boolean(user.isAdmin),
    myBooking: myBookingForSelectedDate,
    bookingFor,
    onBookingForChange: setBookingFor,
    isSubmitting,
    onBook: handleBookSelectedDesk,
    onRemove: () => handleRemoveDeskBooking(selectedDeskId),
    onClose: closeDeskDetails
  };

  return (
    <div className="min-h-screen text-[#0D0E20]">
      <BrandBackground />
      <AppHeader user={user} activeView={activeView} onChangeView={changeView} onLogout={handleLogout} />

      <main className="mx-auto flex max-w-[1360px] flex-col gap-3 px-4 pb-28 pt-3 md:gap-5 md:px-8 md:pb-10 md:pt-7">
        {activeView === 'desk' ? (
          <>
            <section aria-label="Choose a day" className="flex flex-wrap items-end justify-between gap-2.5 md:gap-5">
              <div className="min-w-0">
                <p className="mb-1 hidden text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9CC3D6] md:block">
                  Week of {formatLongDate(getWorkWeek(selectedDate)[0]).split(' ').slice(1).join(' ')}
                </p>
                <h1 className="font-heading text-[21px] font-bold leading-tight text-white md:text-[34px]">
                  {formatLongDate(selectedDate)}
                </h1>
                <p
                  className={`mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold md:mt-1 md:text-[15px] ${
                    myBookingForSelectedDate && !user.isAdmin ? 'text-sfIce' : 'text-[#C9DCE6]'
                  }`}
                >
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
                  {deskStatusLine}
                  {!user.isAdmin && myBookingForSelectedDate ? (
                    <span className="hidden font-normal text-[#9CC3D6] md:inline">
                      · {bookingCountToday} of {DESKS.length} booked, {freeDeskCount} free
                    </span>
                  ) : null}
                </p>
              </div>
              <WeekStrip
                days={weekDays}
                selectedDate={selectedDate}
                onSelectDate={goToDate}
                onPreviousWeek={() => goToDate(previousWeekDate)}
                onNextWeek={() => goToDate(nextWeekDate)}
                canGoPreviousWeek={Boolean(previousWeekDate)}
                canGoNextWeek={Boolean(nextWeekDate)}
                totalDesks={DESKS.length}
              />
            </section>

            <div className="flex flex-wrap items-start gap-5">
              <section
                aria-label="Office floor plan"
                className="min-w-0 flex-[999_1_640px] md:rounded-[20px] md:bg-white md:px-6 md:pb-6 md:pt-5 md:shadow-[0_12px_40px_rgba(0,20,35,0.35)]"
              >
                <div className="hidden flex-wrap items-center justify-between gap-3 md:flex">
                  <div className="flex flex-wrap items-center gap-[18px] text-sm font-medium text-[#334155]">
                    <LegendItem look={DESK_LOOK.free} label="Free" />
                    <LegendItem look={DESK_LOOK.booked} label="Booked" />
                    <LegendItem look={DESK_LOOK.mine} label="Your desk" />
                  </div>
                  <p className="text-sm text-[#5B6475]">Select a desk to see who's there or book it</p>
                </div>
                <div className="md:mt-[18px]">
                  <FloorPlan
                    bookings={bookings}
                    currentUser={user}
                    selectedDeskId={selectedDeskId}
                    onSelectDesk={handleSelectDesk}
                  />
                </div>
              </section>

              <aside aria-label="Booking details" className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
                {selectedDeskId ? (
                  <section className={`${CARD} hidden p-[22px] md:block`}>
                    <DeskDetails {...deskDetailsProps} />
                  </section>
                ) : (
                  <div className="hidden md:block">
                    <YourDeskCard
                      isAdmin={Boolean(user.isAdmin)}
                      myBooking={myBookingForSelectedDate}
                      dateLabel={shortDateLabel}
                      freeCount={freeDeskCount}
                      isSubmitting={isSubmitting}
                      onShowOnPlan={() => setSelectedDeskId(myBookingForSelectedDate?.deskId ?? null)}
                      onCancel={() => handleRemoveDeskBooking(myBookingForSelectedDate?.deskId)}
                    />
                  </div>
                )}
                <InOfficeList people={peopleInOffice} onSelect={handleSelectDesk} />
              </aside>
            </div>

            <BottomSheet open={Boolean(selectedDeskId)} onClose={closeDeskDetails} label={`Desk ${selectedDeskId ?? ''} details`}>
              <DeskDetails {...deskDetailsProps} inSheet />
            </BottomSheet>
          </>
        ) : activeView === 'calendar' ? (
          <section>
            <h1 className="mb-4 font-heading text-[28px] font-bold text-white md:text-[34px]">Calendar</h1>
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
              selectedDate={selectedDate}
            />
          </section>
        ) : (
          <MyBookings
            bookings={myBookings}
            currentUser={user}
            deskNameById={deskNameById}
            isLoading={isMyBookingsLoading}
            onOpenBooking={handleOpenMyBooking}
            onDeleteBooking={handleDeleteMyBooking}
            isAdmin={Boolean(user?.isAdmin)}
            onExportCsv={handleExportBookingsCsv}
          />
        )}
      </main>

      <MobileTabBar isAdmin={Boolean(user.isAdmin)} activeView={activeView} onChangeView={changeView} />

      {error || success ? (
        <div
          role={error ? 'alert' : 'status'}
          className={`fixed inset-x-4 bottom-[100px] z-50 mx-auto flex max-w-md items-center gap-2.5 rounded-[14px] px-4 py-3.5 text-[15px] font-semibold shadow-[0_8px_24px_rgba(13,14,32,0.25)] md:bottom-6 md:left-auto md:right-6 md:mx-0 ${
            error ? 'bg-[#FEF3F2] text-[#B42318] ring-1 ring-[#E8B4AE]' : 'bg-white text-sfNavy'
          }`}
        >
          {error ? null : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007AB7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
          <span className="flex-1">{error || success}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={clearNotices}
            className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${error ? 'hover:bg-[#FDE2DF]' : 'hover:bg-[#EAEEF1]'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default App;
