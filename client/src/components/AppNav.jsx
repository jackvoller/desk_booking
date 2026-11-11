import { useEffect, useRef, useState } from 'react';
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

function MenuIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

const MENU_PANEL =
  'absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-2xl bg-white p-2 text-sfNavy shadow-[0_16px_40px_rgba(0,20,35,0.45)]';

// Header with the main tabs on wider screens. On phones the tabs move into a
// menu button, and signing out sits behind your initials on every screen size.
export function AppHeader({ user, activeView, onChangeView, onLogout }) {
  const [openMenu, setOpenMenu] = useState(null);
  const menusRef = useRef(null);
  const tabs = getTabs(user?.isAdmin);

  useEffect(() => {
    if (!openMenu) {
      return undefined;
    }

    const handlePointer = (event) => {
      if (menusRef.current && !menusRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    };
    document.addEventListener('pointerdown', handlePointer);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('keydown', handleKey);
    };
  }, [openMenu]);

  const toggle = (menu) => setOpenMenu((current) => (current === menu ? null : menu));

  return (
    <header className="relative z-40 border-b border-white/10">
      <div className="mx-auto flex max-w-[1360px] items-center gap-7 px-4 py-2 md:px-8 md:py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-sfIce md:h-[34px] md:w-[34px] md:rounded-[10px]">
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
          {tabs.map(({ id, label, Icon }) => {
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

        <div ref={menusRef} className="ml-auto flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={openMenu === 'account'}
              aria-label={`Account: ${user?.username ?? ''}`}
              onClick={() => toggle('account')}
              className="flex h-11 items-center gap-2.5 rounded-full pl-1.5 pr-1.5 transition hover:bg-white/10 lg:pr-3"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-sfIce text-xs font-bold text-sfNavy md:h-9 md:w-9 md:text-[13px]"
              >
                {getInitials(user?.username)}
              </span>
              <span className="hidden text-[15px] font-semibold text-white lg:inline">{user?.username}</span>
            </button>
            {openMenu === 'account' ? (
              <div role="menu" aria-label="Account" className={MENU_PANEL}>
                <div className="px-3 pb-2.5 pt-2">
                  <p className="truncate text-[15px] font-bold">{user?.username}</p>
                  <p className="truncate text-[13px] text-[#5B6475]">{user?.email}</p>
                </div>
                <div className="mx-1 border-t border-[#E4E9EF]" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpenMenu(null);
                    onLogout();
                  }}
                  className="mt-1 flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[15px] font-semibold text-[#B42318] transition hover:bg-[#FEF3F2]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  Log out
                </button>
              </div>
            ) : null}
          </div>

          <div className="relative md:hidden">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={openMenu === 'nav'}
              aria-label="Menu"
              onClick={() => toggle('nav')}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 text-white transition hover:bg-white/10"
            >
              <MenuIcon open={openMenu === 'nav'} />
            </button>
            {openMenu === 'nav' ? (
              <nav aria-label="Main" className={MENU_PANEL}>
                {tabs.map(({ id, label, Icon }) => {
                  const isActive = activeView === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        setOpenMenu(null);
                        onChangeView(id);
                      }}
                      className={`flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base font-semibold transition ${
                        isActive ? 'bg-[#E8F8FC] text-[#04588C]' : 'text-sfNavy hover:bg-[#F3F6F9]'
                      }`}
                    >
                      <Icon size={20} />
                      {label}
                    </button>
                  );
                })}
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
