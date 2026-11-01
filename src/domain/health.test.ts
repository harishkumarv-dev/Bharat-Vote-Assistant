import { describe, expect, it } from 'vitest';
import type { BudgetItem, EventDraft, Guest, PlanTask, Vendor } from '../types';
import { allocateBudget } from './budget';
import { createEvent } from './factory';
import { buildInsights, computePlanHealth } from './health';
import { createGuest } from './guests';
import { createVendor } from './vendors';

const FIXED_NOW = new Date(2026, 10, 1, 10, 0, 0);

function draft(overrides: Partial<EventDraft> = {}): EventDraft {
  return {
    type: 'wedding',
    name: 'Health check wedding',
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

function baseEvent(overrides: Partial<EventDraft> = {}) {
  return createEvent(draft(overrides), FIXED_NOW);
}

function task(overrides: Partial<PlanTask> = {}): PlanTask {
  return {
    id: 'task_health',
    title: 'Test milestone',
    phase: 'details',
    due: '2027-01-01',
    done: false,
    priority: 'medium',
    notes: '',
    ...overrides,
  };
}

function vendor(category: string, status: Vendor['status'] = 'booked'): Vendor {
  return createVendor('wedding', { name: `${category} partner`, category, status });
}

function guest(overrides: Partial<Guest> = {}): Guest {
  return createGuest({ name: 'A guest', rsvp: 'attending', ...overrides });
}

function budgetItem(category: string, estimated: number, actual: number | null = null): BudgetItem {
  return {
    id: `budget_${category}`,
    category,
    label: category,
    estimated,
    actual,
    paid: false,
    notes: '',
  };
}

describe('computePlanHealth', () => {
  it('returns On track when every factor is healthy', () => {
    const event = baseEvent();
    event.tasks = [task({ due: '2027-02-01' })];
    event.vendors = ['venue', 'catering', 'photography', 'officiant'].map((category) =>
      vendor(category),
    );
    event.guests = [guest({ rsvp: 'attending' }), guest({ rsvp: 'declined' })];

    const health = computePlanHealth(event, FIXED_NOW);
    expect(health.score).toBe(100);
    expect(health.label).toBe('On track');
    expect(health.factors.map((factor) => factor.id)).toEqual([
      'budget',
      'timeline',
      'vendors',
      'guests',
    ]);
    expect(health.factors.every((factor) => factor.score === 100)).toBe(true);
  });

  it('marks an empty, over-budget plan as at risk', () => {
    const event = baseEvent({ date: '2026-11-10' });
    event.budget.items = allocateBudget(20_000, 'wedding').map((item) => ({
      ...item,
      estimated: item.estimated * 2,
      actual: item.estimated * 2,
    }));
    event.tasks = [task({ due: '2026-10-01' }), task({ id: 'task2', due: '2026-10-02' })];
    event.vendors = [];
    event.guests = [];

    const health = computePlanHealth(event, FIXED_NOW);
    expect(health.score).toBeLessThan(50);
    expect(health.label).toBe('At risk');
    expect(health.factors.find((factor) => factor.id === 'budget')!.score).toBe(15);
    expect(health.factors.find((factor) => factor.id === 'timeline')!.score).toBe(50);
    expect(health.factors.find((factor) => factor.id === 'vendors')!.score).toBe(35);
    expect(health.factors.find((factor) => factor.id === 'guests')!.score).toBe(40);
  });

  it('scores a past event on completion and handles missing categories safely', () => {
    const event = baseEvent({ date: '2026-10-01' });
    event.tasks = [
      task({ due: '2026-09-01', done: true }),
      task({ id: 'task_2', due: '2026-09-02', done: false }),
    ];
    event.vendors = [];
    event.guests = [];
    event.basics.budget = 0;
    event.budget.items = [];

    const health = computePlanHealth(event, FIXED_NOW);
    expect(health.factors.find((factor) => factor.id === 'timeline')!.score).toBe(50);
    expect(health.factors.find((factor) => factor.id === 'budget')!.score).toBe(50);
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
  });
});

describe('buildInsights', () => {
  it('prioritises critical budget and timeline problems', () => {
    const event = baseEvent({ date: '2026-11-20' });
    event.budget.items = [budgetItem('venue', 25_000, 26_000)];
    event.tasks = [task({ due: '2026-10-01', priority: 'high' })];
    event.vendors = [];
    event.guests = [guest({ rsvp: 'pending' })];

    const insights = buildInsights(event, FIXED_NOW);
    expect(insights[0].id).toBe('budget-over');
    expect(insights[0].severity).toBe('critical');
    expect(insights.map((entry) => entry.id)).toContain('timeline-overdue');
    expect(insights.map((entry) => entry.id)).toContain('vendors-missing');
    expect(insights.length).toBeLessThanOrEqual(7);
  });

  it('surfaces readiness, dietary, and accessibility positives', () => {
    const event = baseEvent({ date: '2027-05-01' });
    event.vendors = ['venue', 'catering', 'photography', 'officiant'].map((category) =>
      vendor(category),
    );
    event.guests = [
      guest({ rsvp: 'attending', dietary: ['vegan', 'nut-free'] }),
      guest({ id: 'guest_2', rsvp: 'maybe' }),
    ];
    event.vibe.accessibility = ['step-free', 'quiet-room'];
    event.vibe.dietary = ['vegan'];

    const insights = buildInsights(event, FIXED_NOW);
    const ids = insights.map((entry) => entry.id);
    expect(ids).toContain('vendors-ready');
    expect(ids).toContain('guests-dietary');
    expect(ids).toContain('accessibility-plan');
    expect(insights.find((entry) => entry.id === 'vendors-ready')!.severity).toBe('good');
  });

  it('reports unallocated budget, pending RSVPs, and a blank guest list', () => {
    const unallocated = baseEvent();
    unallocated.budget.items = [budgetItem('venue', 1_000)];
    expect(buildInsights(unallocated, FIXED_NOW).map((entry) => entry.id)).toContain(
      'budget-unallocated',
    );

    const pending = baseEvent({ date: '2026-11-20' });
    pending.vendors = ['venue', 'catering', 'photography', 'officiant'].map((category) =>
      vendor(category),
    );
    pending.guests = [guest({ rsvp: 'pending' }), guest({ id: 'guest_2', rsvp: 'maybe' })];
    expect(buildInsights(pending, FIXED_NOW).map((entry) => entry.id)).toContain('guests-pending');

    const blank = baseEvent();
    blank.vendors = ['venue', 'catering', 'photography', 'officiant'].map((category) =>
      vendor(category),
    );
    expect(buildInsights(blank, FIXED_NOW).map((entry) => entry.id)).toContain('guests-empty');
  });

  it('warns about high-priority work in the final fortnight', () => {
    const event = baseEvent({ date: '2026-11-12' });
    event.vendors = ['venue', 'catering', 'photography', 'officiant'].map((category) =>
      vendor(category),
    );
    event.guests = [guest({ rsvp: 'attending' })];
    event.tasks = [task({ due: '2026-11-11', priority: 'high' })];

    const insights = buildInsights(event, FIXED_NOW);
    const finalTask = insights.find((entry) => entry.id === 'timeline-final');
    expect(finalTask).toMatchObject({ severity: 'warning' });
    expect(finalTask?.detail).toContain('11 days');
  });

  it('returns only sorted, supported insights for a healthy plan', () => {
    const event = baseEvent();
    event.vendors = ['venue', 'catering', 'photography', 'officiant'].map((category) =>
      vendor(category),
    );
    event.guests = [guest({ rsvp: 'attending' })];
    event.tasks = [task({ due: '2027-02-01' })];
    const insights = buildInsights(event, FIXED_NOW);
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.every((entry) => ['info', 'good'].includes(entry.severity))).toBe(true);
  });
});
