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
