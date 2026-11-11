import { useCallback, useEffect, useState } from 'react';
import { api } from '../utils/api';
import { getInitials } from '../utils/bookings';
import { CARD } from './DeskPanel';

const INPUT =
  'h-11 w-full rounded-xl border border-[#D5DDE5] px-3 text-base text-sfNavy placeholder:text-[#8792A2] focus:border-[#007AB7] focus:outline-none focus:ring-2 focus:ring-[#007AB7]/25';

// Admin-only list of people who may book desks under someone else's name
// (for example, to block desks for external visitors) without admin access.
function AccessManager() {
  const [delegates, setDelegates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await api.getDelegates();
      setDelegates(response.delegates ?? []);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Enter an email address.');
      return;
    }

    setIsSaving(true);
    try {
      await api.addDelegate(trimmedEmail, name.trim());
      setNotice(`${trimmedEmail} can now book desks for others.`);
      setEmail('');
      setName('');
      await load();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (delegate) => {
    setError('');
    setNotice('');
    if (!window.confirm(`Stop ${delegate.name || delegate.email} booking desks for others? Desks they've already booked stay booked.`)) {
      return;
    }

    setRemovingId(delegate.id);
    try {
      await api.removeDelegate(delegate.id);
      setNotice(`${delegate.email} can no longer book for others.`);
      await load();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-[28px] font-bold text-white md:text-[34px]">Access</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#C9DCE6] md:text-[15px]">
          People on this list can book desks under someone else's name, for example to block desks for visitors. They
          don't get admin access: they can't see everyone's bookings or remove other people's.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <form onSubmit={handleAdd} className={`${CARD} flex min-w-0 flex-[1_1_320px] flex-col gap-3 p-[22px]`}>
          <h2 className="font-heading text-[19px] font-bold text-sfNavy">Add someone</h2>
          <div>
            <label htmlFor="delegate-email" className="block text-sm font-semibold text-[#334155]">
              Email
            </label>
            <input
              id="delegate-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@silverfin.com"
              autoComplete="off"
              disabled={isSaving}
              className={`mt-1 ${INPUT}`}
            />
            <p className="mt-1 text-[13px] text-[#5B6475]">Use the email they sign in with. For Slack sign-in, that's their Slack email.</p>
          </div>
          <div>
            <label htmlFor="delegate-name" className="block text-sm font-semibold text-[#334155]">
              Name (optional)
            </label>
            <input
              id="delegate-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="So you know who it is"
              maxLength={80}
              disabled={isSaving}
              className={`mt-1 ${INPUT}`}
            />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="flex h-[50px] w-full items-center justify-center rounded-xl bg-[#04588C] px-4 text-base font-bold text-white transition hover:bg-sfNavy disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Allow booking for others'}
          </button>
          {error ? (
            <p role="alert" className="rounded-xl bg-[#FEF3F2] px-3 py-2.5 text-sm font-semibold text-[#B42318]">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="rounded-xl bg-[#E8F8FC] px-3 py-2.5 text-sm font-semibold text-[#036483]">
              {notice}
            </p>
          ) : null}
        </form>

        <section className={`${CARD} min-w-0 flex-[2_1_420px] px-3 pb-3 pt-[18px]`}>
          <div className="flex items-center justify-between px-2.5 pb-2.5">
            <h2 className="font-heading text-[19px] font-bold text-sfNavy">Can book for others</h2>
            <span className="text-sm text-[#5B6475]">
              {delegates.length} {delegates.length === 1 ? 'person' : 'people'}
            </span>
          </div>
          {isLoading ? (
            <p className="px-2.5 pb-3 text-[15px] text-[#4A5568]">Loading…</p>
          ) : delegates.length === 0 ? (
            <p className="px-2.5 pb-3 text-[15px] text-[#4A5568]">Nobody yet. Add someone to let them block desks for visitors.</p>
          ) : (
            delegates.map((delegate) => (
              <div key={delegate.id} className="flex min-h-[56px] items-center gap-3 rounded-xl px-2.5 py-2">
                <span
                  aria-hidden="true"
                  className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-[#5B6B80] text-xs font-bold text-white"
                >
                  {getInitials(delegate.name || delegate.email)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-sfNavy">{delegate.name || delegate.email}</span>
                  {delegate.name ? <span className="block truncate text-[13px] text-[#5B6475]">{delegate.email}</span> : null}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(delegate)}
                  disabled={removingId === delegate.id}
                  aria-label={`Remove ${delegate.email}`}
                  className="h-10 flex-none rounded-xl border border-[#E8B4AE] bg-white px-3.5 text-sm font-bold text-[#B42318] transition hover:bg-[#FEF3F2] disabled:opacity-60"
                >
                  {removingId === delegate.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            ))
          )}
        </section>
      </div>
    </section>
  );
}

export default AccessManager;
