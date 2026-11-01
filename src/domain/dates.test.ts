import { describe, expect, it } from 'vitest';
import {
  addDaysIso,
  countdownLabel,
  daysBetweenIso,
  formatDate,
  isPastDate,
  isValidIsoDate,
  relativeDayLabel,
  todayIso,
} from './dates';

describe('date helpers', () => {
  it('validates real calendar dates and rejects impossible ones', () => {
    expect(isValidIsoDate('2026-02-28')).toBe(true);
    expect(isValidIsoDate('2028-02-29')).toBe(true);
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('26-01-01')).toBe(false);
    expect(isValidIsoDate('')).toBe(false);
  });

  it('formats the local calendar day without timezone drift', () => {
    expect(todayIso(new Date(2026, 10, 1, 0, 5))).toBe('2026-11-01');
    expect(todayIso(new Date(2026, 10, 1, 23, 55))).toBe('2026-11-01');
  });

  it('adds days across months, leap days, and years', () => {
    expect(addDaysIso('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDaysIso('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysIso('2026-03-01', -1)).toBe('2026-02-28');
    expect(() => addDaysIso('not-a-date', 1)).toThrow('Invalid date');
  });

  it('counts whole days in both directions', () => {
    expect(daysBetweenIso('2026-11-01', '2026-11-10')).toBe(9);
    expect(daysBetweenIso('2026-11-10', '2026-11-01')).toBe(-9);
    expect(daysBetweenIso('2026-11-01', 'nope')).toBe(0);
  });

  it('renders relative labels for the near future and overdue dates', () => {
    const now = new Date(2026, 10, 1, 9, 0);
    expect(relativeDayLabel('2026-11-01', now)).toBe('Today');
    expect(relativeDayLabel('2026-11-02', now)).toBe('Tomorrow');
    expect(relativeDayLabel('2026-10-31', now)).toBe('Yesterday');
    expect(relativeDayLabel('2026-10-28', now)).toBe('4 days overdue');
    expect(relativeDayLabel('2026-11-04', now)).toBe('In 3 days');
    expect(relativeDayLabel('2026-11-12', now)).toBe('In 1 week');
    expect(relativeDayLabel('2026-12-01', now)).toMatch(/In \d+ weeks/);
    expect(relativeDayLabel('2027-02-14', now)).toBe('Feb 14');
  });

  it('builds countdown and past-event copy', () => {
    const now = new Date(2026, 10, 1, 9, 0);
    expect(countdownLabel('2026-11-01', now)).toBe('Today is the day');
    expect(countdownLabel('2026-11-02', now)).toBe('1 day to go');
    expect(countdownLabel('2026-11-11', now)).toBe('10 days to go');
    expect(countdownLabel('2026-10-30', now)).toBe('2 days since the event');
  });

  it('formats dates defensively', () => {
    expect(formatDate('2026-11-01', { month: 'long', day: 'numeric' })).toBe('November 1');
    expect(formatDate('2026-02-30')).toBe('—');
    expect(isPastDate('2026-10-31', new Date(2026, 10, 1, 9, 0))).toBe(true);
    expect(isPastDate('2026-11-02', new Date(2026, 10, 1, 9, 0))).toBe(false);
  });
});
