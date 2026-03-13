import { useMemo } from 'react';
import { CHAIRS, DESKS, FLOOR_HEIGHT, FLOOR_WIDTH } from '../config/floorPlanSchema';

const AVAILABLE_DESK_COLORS = {
  fill: '#10B981',
  stroke: '#10B981'
};

const BOOKED_DESK_COLORS = {
  fill: '#E57373',
  stroke: '#C62828'
};

const BOOKER_NAME_FONT_SIZE = 11.5;

function getScreenRect(width, height, chairPosition) {
  if (chairPosition === 'top') {
    return { x: width / 2 - 20, y: height - 20, width: 40, height: 8 };
  }

  if (chairPosition === 'bottom') {
    return { x: width / 2 - 20, y: 12, width: 40, height: 8 };
  }

  if (chairPosition === 'left') {
    return { x: width - 20, y: height / 2 - 20, width: 8, height: 40 };
  }

  return { x: 12, y: height / 2 - 20, width: 8, height: 40 };
}

function normalizeName(name) {
  if (typeof name !== 'string') {
    return '';
  }

  return name.trim().replace(/\s+/g, ' ');
}

function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

function getLandscapeNameLines(name, deskWidth) {
  const normalized = normalizeName(name);
  if (!normalized) {
    return [];
  }

  const maxLines = 3;
  const maxCharsPerLine = Math.max(6, Math.floor((deskWidth - 18) / 5.6));
  const words = normalized.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
    } else if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      lines.push(word.slice(0, maxCharsPerLine - 1));
      currentLine = word.slice(maxCharsPerLine - 1);
    }

    if (lines.length >= maxLines) {
      break;
    }
  }

  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine);
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }

  const capped = lines.slice(0, maxLines);
  const lastIndex = capped.length - 1;

  if (lastIndex >= 0 && capped[lastIndex].length > maxCharsPerLine) {
    capped[lastIndex] = truncate(capped[lastIndex], maxCharsPerLine);
  }

  return capped;
}

function getPortraitNameLines(name, maxCharsPerLine) {
  const normalized = normalizeName(name);
  if (!normalized) {
    return [];
  }

  const [firstNameRaw, ...surnameParts] = normalized.split(' ');
  const safeMax = Math.max(4, maxCharsPerLine);
  const firstName = truncate(firstNameRaw, safeMax);
  const surname = truncate(surnameParts.join(' '), safeMax);

  if (!surname) {
    return [firstName];
  }

  return [firstName, surname];
}

function Chair({ x, y, rotation = 0 }) {
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
      <rect
        x="-10"
        y="-6"
        width="20"
        height="12"
        rx="2"
        fill="#E0E0E0"
        stroke="#757575"
        strokeWidth="1.5"
      />
      <rect
        x="-8"
        y="-10"
        width="16"
        height="4"
        rx="1"
        fill="#E0E0E0"
        stroke="#757575"
        strokeWidth="1.5"
      />
    </g>
  );
}

function FloorPlan({ bookings, onAvailableDeskClick, onBookedDeskClick }) {
  const bookingsByDesk = useMemo(() => {
    const nextMap = {};
    (bookings ?? []).forEach((booking) => {
      if (booking?.deskId) {
        nextMap[booking.deskId] = booking;
      }
    });
    return nextMap;
  }, [bookings]);

  return (
    <div className="relative overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
      <svg
        viewBox={`0 0 ${FLOOR_WIDTH} ${FLOOR_HEIGHT}`}
        className="h-auto min-w-[960px] w-full"
        role="img"
        aria-label="Office desk layout"
      >
        <path
          d="M 100 60 L 1200 60 L 1200 750 L 900 750 L 900 560 L 100 560 Z"
          fill="#F8FAFC"
          stroke="none"
        />

        <line x1="100" y1="60" x2="1200" y2="60" stroke="#94A3B8" strokeWidth="2.5" />
        <line x1="1200" y1="60" x2="1200" y2="80" stroke="#94A3B8" strokeWidth="2.5" />
        <line x1="1200" y1="160" x2="1200" y2="750" stroke="#94A3B8" strokeWidth="2.5" />
        <line x1="1200" y1="750" x2="900" y2="750" stroke="#94A3B8" strokeWidth="2.5" />
        <line x1="900" y1="750" x2="900" y2="560" stroke="#94A3B8" strokeWidth="2.5" />
        <line x1="900" y1="560" x2="100" y2="560" stroke="#94A3B8" strokeWidth="2.5" />
        <line x1="100" y1="560" x2="100" y2="60" stroke="#94A3B8" strokeWidth="2.5" />

        <line x1="1200" y1="80" x2="1230" y2="80" stroke="#94A3B8" strokeWidth="2" />
        <line x1="1200" y1="160" x2="1230" y2="160" stroke="#94A3B8" strokeWidth="2" />
        <path d="M 1230 80 Q 1240 120 1230 160" stroke="#94A3B8" strokeWidth="1.5" fill="none" />

        {CHAIRS.map((chair, index) => (
          <Chair key={`chair-${index}`} x={chair.x} y={chair.y} rotation={chair.rotation} />
        ))}

        {DESKS.map((desk) => {
          const booking = bookingsByDesk[desk.id];
          const isBooked = Boolean(booking);
          const deskColors = isBooked ? BOOKED_DESK_COLORS : AVAILABLE_DESK_COLORS;
          const screenRect = getScreenRect(desk.width, desk.height, desk.chairPosition);
          const isPortraitDesk = desk.height > desk.width;
          const landscapeNameLines =
            isBooked && !isPortraitDesk ? getLandscapeNameLines(booking.username, desk.width) : [];
          const portraitNameX = desk.width / 2;
          const portraitNameAnchor = 'middle';
          const portraitMaxChars = Math.max(6, Math.floor((desk.width - 30) / 7));
          const portraitNameLines =
            isBooked && isPortraitDesk ? getPortraitNameLines(booking.username, portraitMaxChars) : [];
          const portraitNameY = screenRect.y + 16;

          return (
            <g
              key={desk.id}
              transform={`translate(${desk.x}, ${desk.y})`}
              className="cursor-pointer"
              onClick={() => {
                if (isBooked) {
                  onBookedDeskClick({ desk, booking });
                } else {
                  onAvailableDeskClick(desk);
                }
              }}
            >
              <rect
                width={desk.width}
                height={desk.height}
                rx="12"
                fill={deskColors.fill}
                stroke={deskColors.stroke}
                strokeWidth="3"
              />

              <text
                x="10"
                y="12"
                textAnchor="start"
                dominantBaseline="hanging"
                fill="white"
                fontSize="16"
                fontWeight="700"
              >
                {desk.id}
              </text>

              {landscapeNameLines.length > 0 ? (
                <text
                  x="10"
                  y="40"
                  textAnchor="start"
                  fill="white"
                  fontSize={BOOKER_NAME_FONT_SIZE}
                  fontWeight="700"
                >
                  {landscapeNameLines.map((line, lineIndex) => (
                    <tspan key={`${desk.id}-name-${lineIndex}`} x="10" dy={lineIndex === 0 ? 0 : 13}>
                      {line}
                    </tspan>
                  ))}
                </text>
              ) : null}

              {portraitNameLines.length > 0 ? (
                <text
                  x={portraitNameX}
                  y={portraitNameY}
                  textAnchor={portraitNameAnchor}
                  fill="white"
                  fontSize={BOOKER_NAME_FONT_SIZE}
                  fontWeight="700"
                >
                  {portraitNameLines.map((line, lineIndex) => (
                    <tspan
                      key={`${desk.id}-portrait-name-${lineIndex}`}
                      x={portraitNameX}
                      dy={lineIndex === 0 ? 0 : 11}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              ) : null}

              <rect
                x={screenRect.x}
                y={screenRect.y}
                width={screenRect.width}
                height={screenRect.height}
                rx="2"
                fill="#1B5E20"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default FloorPlan;
