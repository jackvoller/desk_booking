import { getInitials } from '../utils/bookings';

function PlanIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3h18v18H3z" />
      <path d="M3 12h7v9" />
      <path d="M14 3v6h7" />
    </svg>
  );
}

function CalendarIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function ListIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  );
}

function getTabs(isAdmin) {
  return [
    { id: 'desk', label: 'Floor plan', Icon: PlanIcon },
    { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
    { id: 'myBookings', label: isAdmin ? 'All bookings' : 'My bookings', Icon: ListIcon }
  ];
}

export function AppHeader({ user, activeView, onChangeView, onLogout }) {
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex max-w-[1360px] items-center gap-7 px-4 py-3 md:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-sfIce">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="7" height="5" rx="1.5" fill="#012E44" />
              <rect x="10" y="1" width="7" height="5" rx="1.5" fill="#FFFFFF" />
              <rect x="1" y="9" width="7" height="8" rx="1.5" fill="#012E44" opacity="0.55" />
              <rect x="10" y="9" width="7" height="8" rx="1.5" fill="#012E44" />
            </svg>
          </span>
          <span className="font-heading text-lg font-bold text-white md:text-xl">Desk booking</span>
        </div>

        <nav aria-label="Main" className="hidden flex-1 gap-1 md:flex">
          {getTabs(user?.isAdmin).map(({ id, label, Icon }) => {
            const isActive = activeView === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onChangeView(id)}
                className={`flex h-10 items-center gap-2 rounded-[10px] px-3.5 text-[15px] font-semibold transition ${
                  isActive ? 'bg-white/10 text-sfIce' : 'text-[#C9DCE6] hover:text-white'
                }`}
              >
                <Icon />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-sfIce text-[13px] font-bold text-sfNavy"
          >
            {getInitials(user?.username)}
          </span>
          <span className="hidden text-[15px] font-semibold text-white lg:inline" title={user?.email}>
            {user?.username}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="h-9 rounded-[10px] border border-white/25 px-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

export function MobileTabBar({ isAdmin, activeView, onChangeView }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[#DDE3EA] bg-white px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 md:hidden"
    >
      {getTabs(isAdmin).map(({ id, label, Icon }) => {
        const isActive = activeView === id;
        return (
          <button
            key={id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChangeView(id)}
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 text-xs ${
              isActive ? 'font-bold text-[#04588C]' : 'font-semibold text-[#5B6475]'
            }`}
          >
            <Icon size={22} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
