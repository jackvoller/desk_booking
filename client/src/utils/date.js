const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateString, daysToAdd) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + daysToAdd);
  return formatDate(date);
}

export function todayDateString() {
  return formatDate(new Date());
}

export function getMonthLabel(monthString) {
  const [year, month] = monthString.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function getMonthDayCount(monthString) {
  const [year, month] = monthString.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

export function getMonthStartWeekday(monthString) {
  const [year, month] = monthString.split('-').map(Number);
  const jsWeekday = new Date(year, month - 1, 1).getDay();
  return (jsWeekday + 6) % 7;
}

export function shiftMonth(monthString, offset) {
  const [year, month] = monthString.split('-').map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function isWithinAdvanceWindow(dateString, maxDaysAhead = 30) {
  const target = new Date(`${dateString}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((target.getTime() - today.getTime()) / MS_PER_DAY);
  return diffDays >= 0 && diffDays <= maxDaysAhead;
}

export function isWeekendDate(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString ?? '')) {
    return false;
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekDay = date.getDay();
  return weekDay === 0 || weekDay === 6;
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

function parseDateParts(dateString) {
  const [year, month, day] = (dateString ?? '').split('-').map(Number);
  return new Date(year, month - 1, day);
}

// "Wednesday 11 November"
export function formatLongDate(dateString) {
  const date = parseDateParts(dateString);
  return `${WEEKDAY_LONG[date.getDay()]} ${date.getDate()} ${MONTH_LONG[date.getMonth()]}`;
}

// "Wed 11 Nov"
export function formatShortDate(dateString) {
  const date = parseDateParts(dateString);
  return `${WEEKDAY_SHORT[date.getDay()]} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

export function getDateParts(dateString) {
  const date = parseDateParts(dateString);
  return {
    weekdayShort: WEEKDAY_SHORT[date.getDay()],
    weekdayLong: WEEKDAY_LONG[date.getDay()],
    day: date.getDate(),
    monthShort: MONTH_SHORT[date.getMonth()],
    monthLong: MONTH_LONG[date.getMonth()],
    year: date.getFullYear()
  };
}

// Monday of the week containing dateString.
export function getWeekStart(dateString) {
  const date = parseDateParts(dateString);
  const offset = (date.getDay() + 6) % 7;
  return addDays(dateString, -offset);
}

// Monday to Friday of the week containing dateString.
export function getWorkWeek(dateString) {
  const monday = getWeekStart(dateString);
  return [0, 1, 2, 3, 4].map((offset) => addDays(monday, offset));
}
