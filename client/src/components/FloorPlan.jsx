import { useMemo } from 'react';
import { DESKS, ENTRANCE, FLOOR_CROP, LOUNGE, ROOM_OUTLINE, ROOM_WALLS } from '../config/floorPlanSchema';
import { getFirstName, getInitials, isOwnBooking } from '../utils/bookings';

// The plan is drawn landscape on wider screens. On phones it is turned a quarter
// turn anticlockwise (entrance at the top) so it runs down the screen and every
// desk stays big enough to tap.
const CROP = FLOOR_CROP;
const LANDSCAPE = { width: CROP.width, height: CROP.height };
const PORTRAIT = { width: CROP.height, height: CROP.width };

// Where each side ends up after the anticlockwise turn.
const PORTRAIT_SIDE = { top: 'left', right: 'top', bottom: 'right', left: 'bottom' };

export const DESK_LOOK = {
  // Silverfin palette: Ice for free, Smoke/slate for taken, Indigo for yours.
  free: { bg: '#E8F8FC', border: '#13C5E2', text: '#036483', bar: 'rgba(1,46,68,0.4)', chair: '#A7E6F3' },
  booked: { bg: '#D9E1E8', border: '#B8C4D1', text: '#334155', bar: 'rgba(51,65,85,0.4)', chair: '#C3CDD8' },
  mine: { bg: '#04588C', border: '#04588C', text: '#FFFFFF', bar: 'rgba(255,255,255,0.6)', chair: '#7FB3D3' }
};

const SIZES = {
  lg: { chairOffset: 16, chairLong: 28, chairShort: 9, barInset: 5, barThickness: 4, pad: 9, barPad: 16, radius: 10 },
  sm: { chairOffset: 12, chairLong: 20, chairShort: 7, barInset: 4, barThickness: 3, pad: 3, barPad: 9, radius: 8 }
};

function toPoint([x, y], portrait) {
  return portrait ? [y - CROP.y, CROP.x + CROP.width - x] : [x - CROP.x, y - CROP.y];
}

function toRect(rect, portrait) {
  if (!portrait) {
    return { x: rect.x - CROP.x, y: rect.y - CROP.y, width: rect.width, height: rect.height };
  }

  return {
    x: rect.y - CROP.y,
    y: CROP.x + CROP.width - (rect.x + rect.width),
    width: rect.height,
    height: rect.width
  };
}

// Small phone-only nudges (portrait units) so labels and chairs have breathing room.
const PORTRAIT_NUDGE = { R: { x: 24, y: 0 } };

function deskRect(desk, portrait) {
  const rect = toRect(desk, portrait);
  const nudge = portrait ? PORTRAIT_NUDGE[desk.id.charAt(0)] : null;
  return nudge ? { ...rect, x: rect.x + nudge.x, y: rect.y + nudge.y } : rect;
}

function pointsToPath(points, portrait, close = false) {
  const segments = points.map((point, index) => {
    const [x, y] = toPoint(point, portrait);
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  });
  return `${segments.join(' ')}${close ? ' Z' : ''}`;
}

function percentBox(rect, frame) {
  return {
    left: `${(rect.x / frame.width) * 100}%`,
    top: `${(rect.y / frame.height) * 100}%`,
    width: `${(rect.width / frame.width) * 100}%`,
    height: `${(rect.height / frame.height) * 100}%`
  };
}

function chairStyle(side, size) {
  const s = SIZES[size];
  const gap = s.chairOffset - s.chairShort - 1;
  if (side === 'top' || side === 'bottom') {
    return {
      left: '50%',
      top: side === 'top' ? -s.chairOffset : `calc(100% + ${gap}px)`,
      width: s.chairLong,
      height: s.chairShort,
      transform: 'translateX(-50%)'
    };
  }

  return {
    top: '50%',
    left: side === 'left' ? -s.chairOffset : `calc(100% + ${gap}px)`,
    width: s.chairShort,
    height: s.chairLong,
    transform: 'translateY(-50%)'
  };
}

// The monitor sits on the side of the desk opposite the chair.
function monitorStyle(chairSide, size) {
  const s = SIZES[size];
  const far = `calc(100% - ${s.barInset + s.barThickness}px)`;
  if (chairSide === 'top' || chairSide === 'bottom') {
    return {
      left: '50%',
      top: chairSide === 'top' ? far : s.barInset,
      width: '42%',
      height: s.barThickness,
      transform: 'translateX(-50%)'
    };
  }

  return {
    top: '50%',
    left: chairSide === 'left' ? far : s.barInset,
    width: s.barThickness,
    height: '42%',
    transform: 'translateY(-50%)'
  };
}

function contentPadding(chairSide, size) {
  const { pad, barPad } = SIZES[size];
  const sides = { top: pad, right: pad, bottom: pad, left: pad };
  const monitorSide = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[chairSide];
  sides[monitorSide] = barPad;
  return `${sides.top}px ${sides.right}px ${sides.bottom}px ${sides.left}px`;
}

export function getDeskStatus(booking, user) {
  if (!booking) {
    return 'free';
  }

  return isOwnBooking(booking, user) ? 'mine' : 'booked';
}

export function Avatar({ name, size = 22, tone = '#5B6B80', className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-none items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{ width: size, height: size, background: tone, fontSize: Math.max(8, Math.round(size * 0.4)) }}
    >
      {getInitials(name)}
    </span>
  );
}

function DeskTile({ desk, portrait, frame, booking, status, isSelected, onSelect }) {
  const size = portrait ? 'sm' : 'lg';
  const look = DESK_LOOK[status];
  const side = portrait ? PORTRAIT_SIDE[desk.chairPosition] : desk.chairPosition;
  const rect = deskRect(desk, portrait);
  const name = booking?.username ?? '';
  const label =
    status === 'free'
      ? `Desk ${desk.id}, free`
      : status === 'mine'
        ? `Desk ${desk.id}, your booking`
        : `Desk ${desk.id}, booked by ${name}`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isSelected}
      title={label}
      onClick={() => onSelect(desk.id)}
      className="absolute flex cursor-pointer transition-transform duration-100 hover:-translate-y-px focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#007AB7]"
      style={{
        ...percentBox(rect, frame),
        boxSizing: 'border-box',
        padding: contentPadding(side, size),
        border: `1.5px solid ${look.border}`,
        borderRadius: SIZES[size].radius,
        background: look.bg,
        color: look.text,
        zIndex: isSelected ? 3 : 1,
        boxShadow: isSelected
          ? `0 0 0 ${portrait ? 2 : 3}px #FFFFFF, 0 0 0 ${portrait ? 5 : 6}px #007AB7`
          : portrait
            ? 'none'
            : '0 1px 2px rgba(13,14,32,0.06)',
        ...(portrait
          ? { flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', justifyContent: 'center', gap: '3px 4px' }
          : { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, textAlign: 'left' })
      }}
    >
      <span
        aria-hidden="true"
        className="absolute"
        style={{ ...chairStyle(side, size), background: look.chair, borderRadius: portrait ? 3 : 4 }}
      />
      <span
        aria-hidden="true"
        className="absolute"
        style={{ ...monitorStyle(side, size), background: look.bar, borderRadius: 2 }}
      />

      <span className={`font-bold leading-none ${portrait ? 'text-xs' : 'text-[15px]'}`}>{desk.id}</span>

      {portrait ? (
        status === 'booked' ? <Avatar name={name} size={18} /> : null
      ) : status === 'free' ? (
        <span className="text-xs font-semibold leading-none">Free</span>
      ) : status === 'mine' ? (
        <span className="rounded-full bg-white/20 px-2 py-[3px] text-xs font-bold leading-none">You</span>
      ) : (
        <span className="flex min-w-0 max-w-full flex-wrap items-center gap-[5px]">
          <Avatar name={name} size={22} />
          <span className="min-w-0 max-w-full truncate text-xs font-semibold leading-tight">{getFirstName(name)}</span>
        </span>
      )}
    </button>
  );
}

function RoomDrawing({ portrait, patternId }) {
  const frame = portrait ? PORTRAIT : LANDSCAPE;
  const wallWidth = portrait ? 6 : 4;
  const lineWidth = portrait ? 3 : 2;
  const { arc } = ENTRANCE;
  const [ax, ay] = toPoint(arc.from, portrait);
  const [cx, cy] = toPoint(arc.control, portrait);
  const [bx, by] = toPoint(arc.to, portrait);
  const jambs = ENTRANCE.jambs.map((jamb) => pointsToPath(jamb, portrait)).join(' ');
  const outline = pointsToPath(ROOM_OUTLINE, portrait, true);

  return (
    <svg
      viewBox={`0 0 ${frame.width} ${frame.height}`}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <pattern id={patternId} width={portrait ? 28 : 24} height={portrait ? 28 : 24} patternUnits="userSpaceOnUse">
          <circle cx={portrait ? 3 : 2} cy={portrait ? 3 : 2} r={portrait ? 2 : 1.4} fill="#DCE3EA" />
        </pattern>
      </defs>
      <path d={outline} fill={portrait ? '#FFFFFF' : '#F8FAFC'} />
      <path d={outline} fill={`url(#${patternId})`} />
      <path
        d={pointsToPath(ROOM_WALLS, portrait)}
        fill="none"
        stroke="#9AA8B8"
        strokeWidth={wallWidth}
        strokeLinejoin="round"
      />
      <path d={jambs} stroke="#9AA8B8" strokeWidth={lineWidth} />
      <path
        d={`M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`}
        stroke="#9AA8B8"
        strokeWidth={lineWidth}
        fill="none"
        strokeDasharray={portrait ? '6 6' : '4 4'}
      />
      {LOUNGE.map((item) => {
        const strokeWidth = item.stroke === 'none' ? 0 : portrait ? 3 : 2;
        if (item.shape === 'circle') {
          const [cxp, cyp] = toPoint([item.cx, item.cy], portrait);
          return (
            <circle key={item.id} cx={cxp} cy={cyp} r={item.r} fill={item.fill} stroke={item.stroke} strokeWidth={strokeWidth} />
          );
        }
        return (
          <rect
            key={item.id}
            {...toRect(item, portrait)}
            rx={item.rx}
            fill={item.fill}
            stroke={item.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={item.dashed ? (portrait ? '10 8' : '8 6') : undefined}
          />
        );
      })}
    </svg>
  );
}

const LABEL_CLASS = 'pointer-events-none absolute whitespace-nowrap font-bold uppercase tracking-[0.08em] text-[#5B6475]';

function ArrowIcon({ direction }) {
  return (
    <svg
      width={direction === 'up' ? 11 : 14}
      height={direction === 'up' ? 11 : 14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={direction === 'up' ? 3 : 2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === 'up' ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
    </svg>
  );
}

function LandscapeLabels() {
  const centred = 'translate(-50%, -50%)';
  return (
    <>
      <span className={`${LABEL_CLASS} text-xs`} style={{ left: '19.66%', top: '14%', transform: centred }}>
        Left pod
      </span>
      <span className={`${LABEL_CLASS} text-xs`} style={{ left: '52.97%', top: '63.4%', transform: centred }}>
        Centre pod
      </span>
      <span className={`${LABEL_CLASS} text-xs`} style={{ left: '84.15%', top: '16.6%', transform: centred }}>
        Right pod
      </span>
      <span className={`${LABEL_CLASS} text-xs !text-[#036483]`} style={{ left: '79.4%', top: '67.8%', transform: centred }}>
        Lounge
      </span>
      <span
        className={`${LABEL_CLASS} flex items-center gap-1 text-xs`}
        style={{ right: '6.2%', top: '11%', transform: 'translateY(-50%)' }}
      >
        Entrance
        <ArrowIcon direction="right" />
      </span>
    </>
  );
}

// On phones the pods are marked by thin bars in the margin left of the room,
// spanning each pod's rows, instead of labels squeezed between the desks.
const PORTRAIT_POD_MARKERS = [
  { label: 'Right pod', top: 5, bottom: 27 },
  { label: 'Centre pod', top: 36.5, bottom: 57.5 },
  { label: 'Left pod', top: 63, bottom: 97 }
];

function PodMarker({ label, top, bottom }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute flex items-stretch gap-[3px]"
      style={{ left: -15, top: `${top}%`, height: `${bottom - top}%` }}
    >
      <span
        className="flex items-center justify-center whitespace-nowrap text-[9px] font-bold uppercase leading-none tracking-[0.12em] text-[#C9DCE6]"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        {label}
      </span>
      <span className="w-[2px] rounded-full bg-sfIce/70" />
    </div>
  );
}

function PortraitLabels() {
  const centred = 'translate(-50%, -50%)';
  return (
    <>
      <span
        className={`${LABEL_CLASS} flex flex-col items-center gap-0.5 text-[10px] tracking-[0.04em]`}
        style={{ left: '12.5%', top: '6.5%', transform: 'translateX(-50%)' }}
      >
        <ArrowIcon direction="up" />
        Entrance
      </span>
      {PORTRAIT_POD_MARKERS.map((pod) => (
        <PodMarker key={pod.label} {...pod} />
      ))}
      <span className={`${LABEL_CLASS} text-[10px] !text-[#036483]`} style={{ left: '83%', top: '29.3%', transform: centred }}>
        Lounge
      </span>

      <div
        className="pointer-events-none absolute flex flex-col gap-2.5 text-xs font-semibold text-white"
        style={{ left: '76%', top: '40%' }}
      >
        <LegendItem look={DESK_LOOK.free} label="Free" small />
        <LegendItem look={DESK_LOOK.booked} label="Booked" small />
        <LegendItem look={DESK_LOOK.mine} label="You" small />
      </div>
    </>
  );
}

export function LegendItem({ look, label, small = false }) {
  return (
    <span className={`flex items-center ${small ? 'gap-1.5' : 'gap-2'}`}>
      <span
        aria-hidden="true"
        className="box-border rounded"
        style={{
          width: small ? 14 : 18,
          height: 14,
          background: look.bg,
          border: `1.5px solid ${look.border}`
        }}
      />
      {label}
    </span>
  );
}

function Plan({ portrait, bookingsByDesk, currentUser, selectedDeskId, onSelectDesk }) {
  const frame = portrait ? PORTRAIT : LANDSCAPE;

  return (
    <div
      role="group"
      aria-label="Office floor plan"
      className={`relative w-full ${portrait ? 'mx-auto max-w-[420px]' : ''}`}
      style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
    >
      <RoomDrawing portrait={portrait} patternId={portrait ? 'floor-dots-portrait' : 'floor-dots-landscape'} />
      {portrait ? <PortraitLabels /> : <LandscapeLabels />}
      {DESKS.map((desk) => {
        const booking = bookingsByDesk[desk.id];
        return (
          <DeskTile
            key={desk.id}
            desk={desk}
            portrait={portrait}
            frame={frame}
            booking={booking}
            status={getDeskStatus(booking, currentUser)}
            isSelected={selectedDeskId === desk.id}
            onSelect={onSelectDesk}
          />
        );
      })}
    </div>
  );
}

// A thumbnail of the (phone-orientation) plan with one desk highlighted.
export function MiniMap({ deskId, dark = false, className = '' }) {
  const outline = pointsToPath(ROOM_OUTLINE, true, true);
  return (
    <div
      role="img"
      aria-label={`Desk ${deskId} on the floor plan`}
      className={`relative flex-none ${className}`}
      style={{ aspectRatio: `${PORTRAIT.width} / ${PORTRAIT.height}` }}
    >
      <svg viewBox={`0 0 ${PORTRAIT.width} ${PORTRAIT.height}`} aria-hidden="true" className="absolute inset-0 h-full w-full">
        <path
          d={outline}
          fill={dark ? 'rgba(255,255,255,0.12)' : '#FFFFFF'}
          stroke={dark ? 'rgba(255,255,255,0.55)' : '#B8C4D1'}
          strokeWidth={dark ? 14 : 20}
          strokeLinejoin="round"
        />
      </svg>
      {DESKS.map((desk) => {
        const hit = desk.id === deskId;
        return (
          <span
            key={desk.id}
            aria-hidden="true"
            className="absolute rounded-[2px]"
            style={{
              ...percentBox(deskRect(desk, true), PORTRAIT),
              background: hit ? (dark ? '#13C5E2' : '#04588C') : dark ? 'rgba(255,255,255,0.35)' : '#CBD5E1',
              boxShadow: hit && dark ? '0 0 0 2px #04588C, 0 0 0 4px #13C5E2' : 'none'
            }}
          />
        );
      })}
    </div>
  );
}

function FloorPlan({ bookings, currentUser, selectedDeskId, onSelectDesk }) {
  const bookingsByDesk = useMemo(() => {
    const nextMap = {};
    (bookings ?? []).forEach((booking) => {
      if (booking?.deskId) {
        nextMap[booking.deskId] = booking;
      }
    });
    return nextMap;
  }, [bookings]);

  const shared = { bookingsByDesk, currentUser, selectedDeskId, onSelectDesk };

  return (
    <>
      <div className="hidden md:block">
        <Plan portrait={false} {...shared} />
      </div>
      <div className="md:hidden">
        <Plan portrait {...shared} />
      </div>
    </>
  );
}

export default FloorPlan;
