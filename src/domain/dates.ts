/** Date-only helpers. All event dates are stored as YYYY-MM-DD strings. */

const DAY_MS = 86_400_000;

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isoParts(iso: string): [number, number, number] {
  const [year, month, day] = iso.split('-').map(Number);
  return [year, month, day];
}

/** Today in the user's local timezone, as YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysIso(iso: string, days: number): string {
  if (!isValidIsoDate(iso)) throw new Error(`Invalid date: ${iso}`);
  const [year, month, day] = isoParts(iso);
  const date = new Date(Date.UTC(year, month - 1, day) + days * DAY_MS);
  return date.toISOString().slice(0, 10);
}

/** Whole days from one date to another. Positive when `to` is later. */
export function daysBetweenIso(from: string, to: string): number {
  if (!isValidIsoDate(from) || !isValidIsoDate(to)) return 0;
  const [fromYear, fromMonth, fromDay] = isoParts(from);
  const [toYear, toMonth, toDay] = isoParts(to);
  return Math.round(
    (Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / DAY_MS,
  );
}

function localDate(iso: string): Date {
  const [year, month, day] = isoParts(iso);
  // Noon avoids daylight-saving transitions shifting the calendar day.
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function formatDate(
  iso: string,
  options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' },
  locale = 'en-US',
): string {
  if (!isValidIsoDate(iso)) return '—';
  return new Intl.DateTimeFormat(locale, options).format(localDate(iso));
}

export function formatDateShort(iso: string): string {
  return formatDate(iso, { month: 'short', day: 'numeric' });
}

export function formatWeekday(iso: string): string {
  return formatDate(iso, { weekday: 'long' });
}

export function formatMonth(iso: string): string {
  return formatDate(iso, { month: 'long' });
}

export function formatMonthYear(iso: string): string {
  return formatDate(iso, { month: 'long', year: 'numeric' });
}

/** "Today", "in 12 days", "3 days overdue" — relative to a supplied date. */
export function relativeDayLabel(iso: string, now: Date = new Date()): string {
  const days = daysBetweenIso(todayIso(now), iso);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days < 7) return `In ${days} days`;
  if (days < 14) return 'In 1 week';
  if (days < 45) return `In ${Math.round(days / 7)} weeks`;
  return formatDate(iso, { month: 'short', day: 'numeric' });
}

export function countdownLabel(eventDate: string, now: Date = new Date()): string {
  const days = daysBetweenIso(todayIso(now), eventDate);
  if (days === 0) return 'Today is the day';
  if (days === 1) return '1 day to go';
  if (days < 0) return `${Math.abs(days)} days since the event`;
  return `${days.toLocaleString('en-US')} days to go`;
}

export function seasonNote(iso: string): string {
  return formatMonth(iso);
}

export function isPastDate(iso: string, now: Date = new Date()): boolean {
  return isValidIsoDate(iso) && iso < todayIso(now);
}
