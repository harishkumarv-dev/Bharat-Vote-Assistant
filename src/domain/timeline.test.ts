import { describe, expect, it } from 'vitest';
import type { EventDraft, PlanTask } from '../types';
import { addDaysIso, isValidIsoDate } from './dates';
import { createEvent } from './factory';
import {
  buildTimeline,
  buildTimelineIcs,
  computeTimelineStats,
  createTask,
  shiftIncompleteTasks,
  sortTasks,
} from './timeline';

const FIXED_NOW = new Date(2026, 10, 1, 10, 0, 0);

function draft(overrides: Partial<EventDraft> = {}): EventDraft {
  return {
    type: 'wedding',
    name: 'Test wedding',
    date: '2027-05-01',
    location: 'Test venue',
    guestCount: 100,
    budget: 20_000,
    currency: 'USD',
    priorities: ['food'],
    styles: ['outdoor'],
    dietary: [],
    accessibility: [],
    notes: '',
    ...overrides,
  };
}

function task(overrides: Partial<PlanTask> = {}): PlanTask {
  return {
    id: 'task_test',
    title: 'Test task',
    phase: 'details',
    due: '2027-01-10',
    done: false,
    priority: 'medium',
    notes: '',
    ...overrides,
  };
}

describe('buildTimeline', () => {
  it('compresses a short runway without creating tasks in the past', () => {
    const eventDate = addDaysIso('2026-11-01', 30);
    const tasks = buildTimeline('wedding', eventDate, FIXED_NOW);

    expect(tasks).toHaveLength(17);
    expect(new Set(tasks.map((entry) => entry.id)).size).toBe(tasks.length);
    expect(tasks.every((entry) => isValidIsoDate(entry.due))).toBe(true);
    expect(tasks.every((entry) => entry.due >= '2026-11-01')).toBe(true);
    expect(tasks.every((entry) => entry.due <= eventDate)).toBe(true);
    expect(tasks.every((entry) => entry.done === false)).toBe(true);
  });

  it('keeps the natural cadence when there is a full year to plan', () => {
    const tasks = buildTimeline('wedding', '2027-11-01', FIXED_NOW);
    expect(tasks).toHaveLength(17);
    expect(tasks[0].due).toBe('2026-11-01');
    expect(tasks[tasks.length - 1].due).toBe('2027-10-31');
  });

  it('returns no tasks for an invalid date and handles every event type', () => {
    expect(buildTimeline('wedding', 'not-a-date', FIXED_NOW)).toEqual([]);
    for (const type of ['wedding', 'birthday', 'community'] as const) {
      const tasks = buildTimeline(type, addDaysIso('2026-11-01', 90), FIXED_NOW);
      expect(tasks.length).toBeGreaterThan(0);
    }
  });
});

describe('task helpers', () => {
  it('creates a clean task and falls back to today for an invalid due date', () => {
    const created = createTask({
      title: '  Book   the   venue  ',
      phase: 'bookings',
      due: 'not-a-date',
      notes: '  Ask about   access ',
    });
    expect(created.title).toBe('Book the venue');
    expect(created.notes).toBe('Ask about access');
    expect(created.done).toBe(false);
    expect(created.priority).toBe('medium');
    expect(isValidIsoDate(created.due)).toBe(true);
  });

  it('shifts only incomplete tasks and leaves history untouched', () => {
    const tasks = [
      task({ id: 'a', due: '2027-01-10' }),
      task({ id: 'b', due: '2027-01-20', done: true }),
    ];
    const shifted = shiftIncompleteTasks(tasks, 5);
    expect(shifted[0].due).toBe('2027-01-15');
    expect(shifted[1].due).toBe('2027-01-20');
    expect(shiftIncompleteTasks(tasks, 0)).toBe(tasks);
  });

  it('sorts open tasks first, by date, then priority', () => {
    const sorted = sortTasks([
      task({ id: 'done', due: '2026-12-01', done: true, priority: 'high' }),
      task({ id: 'medium', due: '2026-12-02', priority: 'medium' }),
      task({ id: 'high-later', due: '2026-12-03', priority: 'high' }),
      task({ id: 'high-first', due: '2026-12-02', priority: 'high' }),
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual([
      'high-first',
      'medium',
      'high-later',
      'done',
    ]);
  });
});

describe('computeTimelineStats', () => {
  it('counts progress, overdue work, and the next four open tasks', () => {
    const stats = computeTimelineStats(
      [
        task({ id: 'past', due: '2026-10-20', priority: 'high' }),
        task({ id: 'today', due: '2026-11-01', priority: 'low' }),
        task({ id: 'next', due: '2026-11-02' }),
        task({ id: 'done', due: '2026-10-01', done: true }),
        task({ id: 'later', due: '2026-12-01' }),
        task({ id: 'latest', due: '2027-01-01' }),
      ],
      '2027-02-01',
      FIXED_NOW,
    );

    expect(stats.total).toBe(6);
    expect(stats.done).toBe(1);
    expect(stats.overdue).toBe(1);
    expect(stats.completion).toBeCloseTo(1 / 6);
    expect(stats.next.map((entry) => entry.id)).toEqual(['past', 'today', 'next', 'later']);
    expect(stats.daysUntilEvent).toBe(92);
    expect(stats.eventIsPast).toBe(false);
  });

  it('handles an empty plan and a past event', () => {
    const empty = computeTimelineStats([], '2027-01-01', FIXED_NOW);
    expect(empty).toMatchObject({ completion: 0, total: 0, next: [], eventIsPast: false });
    const past = computeTimelineStats([], '2026-10-01', FIXED_NOW);
    expect(past.eventIsPast).toBe(true);
    expect(past.daysUntilEvent).toBeLessThan(0);
  });
});

describe('calendar export', () => {
  it('exports a valid, escaped calendar with folded lines', () => {
    const event = createEvent(draft(), FIXED_NOW);
    event.id = 'event with spaces & symbols';
    event.basics.name = 'Maya, Arjun; garden wedding';
    event.basics.location = 'Hudson Valley, NY';
    event.basics.date = '2027-05-01';
    event.concept.summary =
      'A long, generous description with commas, semicolons; and enough words to require folding across several calendar lines so that the export remains RFC-compliant. '.repeat(
        3,
      );
    event.tasks = [
      task({
        id: 'task/with spaces',
        title: 'Confirm the venue, menu; and access route',
        phase: 'final',
        due: '2027-04-01',
        done: true,
        priority: 'high',
        notes: 'Ask about step-free access.\nConfirm timings.',
      }),
      task({ id: 'task_bad_due', due: 'not-a-date' }),
    ];

    const ics = buildTimelineIcs(event, new Date('2026-11-01T12:34:56Z'));

    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('PRODID:-//Gala Studio//Event Plan//EN');
    expect(ics).toContain('UID:gala-event-eventwithspacesandsymbols@gala.studio');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270501');
    expect(ics).toContain('DTEND;VALUE=DATE:20270502');
    expect(ics).toContain('SUMMARY:Maya\\, Arjun\\; garden wedding');
    expect(ics).toContain('LOCATION:Hudson Valley\\, NY');
    expect(ics).toContain('SUMMARY:✓ Confirm the venue\\, menu\\; and access route');
    expect(ics).toContain('DESCRIPTION:Final stretch — high priority');
    expect(ics).toContain('step-free access.');
    expect(ics).toContain('Confirm timings.');
    expect(ics).toContain('STATUS:COMPLETED');
    expect(ics).toContain('DTSTAMP:20261101T123456Z');
    expect(ics).not.toContain('task_bad_due');
    expect(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(
      true,
    );
  });

  it('uses a helpful fallback location and today when needed', () => {
    const event = createEvent(draft({ location: '' }), FIXED_NOW);
    event.tasks = [];
    const ics = buildTimelineIcs(event);
    expect(ics).toContain('LOCATION:To be confirmed');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });
});
