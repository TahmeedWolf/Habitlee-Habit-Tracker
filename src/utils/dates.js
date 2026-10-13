// All dates are handled as local 'YYYY-MM-DD' strings so streaks line up
// with the day the user actually experiences, not UTC.

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateStr(value) {
  return typeof value === 'string' && DATE_RE.test(value);
}

// Returns 'YYYY-MM-DD' in local time, or null for anything unparseable.
// Never throws — a bad value used to blow up toISOString() and take the
// whole render tree down with it.
export function toDateStr(date) {
  const d = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const y = String(d.getFullYear()).padStart(4, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStr() {
  return toDateStr(new Date());
}

export function parseDateStr(dateStr) {
  if (!isDateStr(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDays(dateStr, n) {
  const d = parseDateStr(dateStr);
  if (!d) return null;
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function dayOfWeek(dateStr) {
  const d = parseDateStr(dateStr);
  return d ? d.getDay() : null;
}

// habit.frequency is either the string 'daily' or an array of weekday
// numbers (0 = Sunday ... 6 = Saturday) the habit is due on.
export function isDue(habit, dateStr) {
  if (!habit || !isDateStr(dateStr)) return false;
  if (habit.frequency === 'daily') return true;
  if (!Array.isArray(habit.frequency)) return false;
  const dow = dayOfWeek(dateStr);
  return dow !== null && habit.frequency.includes(dow);
}

export function isCompleted(habit, dateStr) {
  return !!(habit && habit.completions && habit.completions[dateStr]);
}

export function lastNDates(n, endStr = todayStr()) {
  const out = [];
  if (!isDateStr(endStr)) return out;
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = addDays(endStr, -i);
    if (d) out.push(d);
  }
  return out;
}

// Single letters are ambiguous — S/S for the weekend and T/T midweek is the
// exact confusion this app has to avoid, so two-letter forms are the default
// anywhere a day has to be identified at a glance.
export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
export const WEEKDAY_FULL = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return 'Still up?';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Winding down';
}

export function displayDate(dateStr = todayStr()) {
  const d = parseDateStr(dateStr);
  if (!d) return '';
  return d.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

// Milliseconds until just after the next local midnight — used to re-render
// the app the moment the day rolls over.
export function msUntilNextMidnight(now = new Date()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 500);
  return Math.max(1000, next.getTime() - now.getTime());
}

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

// Human-readable schedule for a habit: 'Every day', 'Weekdays', 'Mo We Fr'.
// The dot strip is history, not a schedule — this is what actually answers
// "when does this repeat?".
export function frequencyLabel(frequency) {
  if (frequency === 'daily') return 'Every day';
  if (!Array.isArray(frequency)) return 'Every day';

  const days = [...new Set(frequency.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))]
    .sort((a, b) => a - b);

  if (days.length === 0) return 'No days set';
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && WEEKDAYS.every((d) => days.includes(d))) return 'Weekdays';
  if (days.length === 2 && WEEKEND.every((d) => days.includes(d))) return 'Weekends';
  return days.map((d) => WEEKDAY_SHORT[d]).join(' ');
}
