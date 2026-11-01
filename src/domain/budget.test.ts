import { describe, expect, it } from 'vitest';
import type { BudgetItem, EventDraft, EventPlan } from '../types';
import {
  allocateBudget,
  categoriesAboveEnvelope,
  computeBudgetSummary,
  recommendSavings,
  rebalanceBudgetItems,
  variableSpend,
} from './budget';
import { BUDGET_CATEGORIES } from './catalog';
import { createEvent } from './factory';

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
    priorities: ['food', 'photos'],
    styles: ['outdoor', 'classic'],
    dietary: ['vegetarian'],
    accessibility: ['step-free'],
    notes: '',
    ...overrides,
  };
}

function eventWith(items: BudgetItem[], overrides: Partial<EventPlan['basics']> = {}): EventPlan {
  const event = createEvent(draft(), FIXED_NOW);
  event.basics = { ...event.basics, ...overrides };
  event.budget = { items };
  event.guests = [];
  return event;
}

function item(category: string, estimated: number, actual: number | null = null): BudgetItem {
  return {
    id: `item_${category}`,
    category,
    label: category,
    estimated,
    actual,
    paid: false,
    notes: '',
  };
}

describe('allocateBudget', () => {
  it('splits the whole budget using the event template', () => {
    const items = allocateBudget(32_000, 'wedding');
    expect(items).toHaveLength(BUDGET_CATEGORIES.wedding.length);
    expect(items.reduce((total, line) => total + line.estimated, 0)).toBe(32_000);
    expect(items.every((line) => line.actual === null && line.paid === false)).toBe(true);
    expect(new Set(items.map((line) => line.id)).size).toBe(items.length);
    expect(items.map((line) => line.category)).toEqual(
      BUDGET_CATEGORIES.wedding.map((category) => category.id),
    );
  });

  it('rounds, clamps, and handles a zero budget', () => {
    expect(allocateBudget(0, 'birthday').every((line) => line.estimated === 0)).toBe(true);
    const negative = allocateBudget(-500, 'community');
    expect(negative.every((line) => line.estimated === 0)).toBe(true);
    const odd = allocateBudget(1_001, 'wedding');
    expect(odd.reduce((total, line) => total + line.estimated, 0)).toBe(1_001);
  });
});

describe('computeBudgetSummary', () => {
  it('uses the larger of estimate and actual for the projection', () => {
    const event = eventWith([item('venue', 400, 500), item('catering', 300, 200)]);
    const summary = computeBudgetSummary(event);

    expect(summary.totalBudget).toBe(20_000);
    expect(summary.planned).toBe(700);
    expect(summary.actual).toBe(700);
    expect(summary.projected).toBe(800);
    expect(summary.remaining).toBe(19_200);
    expect(summary.overBy).toBe(0);
    expect(summary.perGuest).toBe(8);
    expect(summary.effectiveGuests).toBe(100);
    expect(summary.categories).toHaveLength(BUDGET_CATEGORIES.wedding.length);
  });

  it('reports an overrun and the category envelope', () => {
    const event = eventWith([item('venue', 2_500, 2_800), item('catering', 300)], {
      budget: 2_000,
    });
    const summary = computeBudgetSummary(event);

    expect(summary.projected).toBe(3_100);
    expect(summary.overBy).toBe(1_100);
    expect(summary.remaining).toBe(-1_100);
    const venue = summary.categories.find((category) => category.id === 'venue');
    expect(venue?.projected).toBe(2_800);
    expect(venue?.difference).toBeLessThan(0);
  });

  it('uses attending plus-ones for per-guest spend when RSVPs exist', () => {
    const event = eventWith([item('venue', 1_500)]);
    event.guests = [
      {
        id: 'guest_1',
        name: 'A guest',
        email: '',
        group: '',
        rsvp: 'attending',
        plusOnes: 2,
        dietary: [],
        notes: '',
      },
      {
        id: 'guest_2',
        name: 'A maybe',
        email: '',
        group: '',
        rsvp: 'maybe',
        plusOnes: 5,
        dietary: [],
        notes: '',
      },
    ];
    const summary = computeBudgetSummary(event);
    expect(summary.effectiveGuests).toBe(3);
    expect(summary.perGuest).toBe(500);
  });
});

describe('rebalanceBudgetItems', () => {
  it('scales estimates to the target and preserves actual facts', () => {
    const items = [item('venue', 1_000, 1_200), item('catering', 1_000)];
    const rebalanced = rebalanceBudgetItems(items, 1_000, 'wedding');

    expect(rebalanced.reduce((total, line) => total + line.estimated, 0)).toBe(1_000);
    expect(rebalanced[0].actual).toBe(1_200);
    expect(rebalanced[0].estimated).toBe(500);
    expect(rebalanced[1].estimated).toBe(500);
  });

  it('allocates a fresh template when there is nothing to scale', () => {
    expect(rebalanceBudgetItems([], 900, 'birthday')).toHaveLength(
      BUDGET_CATEGORIES.birthday.length,
    );
    const zero = [item('venue', 0), item('catering', 0)];
    const rebalanced = rebalanceBudgetItems(zero, 500, 'wedding');
    expect(rebalanced.reduce((total, line) => total + line.estimated, 0)).toBe(500);
  });
});

describe('savings guidance', () => {
  it('prioritises closing the gap and stays within five suggestions', () => {
    const event = eventWith([item('venue', 4_000, 4_500), item('catering', 4_000)], {
      budget: 6_000,
    });
    const summary = computeBudgetSummary(event);
    const recommendations = recommendSavings(event, summary);

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.length).toBeLessThanOrEqual(5);
    expect(recommendations[0].kind).toBe('gap');
    expect(recommendations[0].savings).toBe(summary.overBy);
    expect(new Set(recommendations.map((entry) => entry.id)).size).toBe(recommendations.length);
  });

  it('calculates a portion of variable spend for a guest-count suggestion', () => {
    const event = eventWith([item('catering', 10_000)], { guestCount: 100 });
    const summary = computeBudgetSummary(event);
    const recommendations = recommendSavings(event, summary);
    const guestRecommendation = recommendations.find((entry) => entry.kind === 'guest');
    expect(guestRecommendation).toBeDefined();
    expect(guestRecommendation!.savings).toBeGreaterThan(0);
    expect(variableSpend(summary)).toBeGreaterThan(0);
  });

  it('finds categories materially above their envelope', () => {
    const event = eventWith([item('venue', 2_500)], { budget: 10_000 });
    const summary = computeBudgetSummary(event);
    const over = categoriesAboveEnvelope(summary);
    expect(over.map((category) => category.id)).toContain('venue');
    expect(categoriesAboveEnvelope(summary, 50)).toHaveLength(0);
  });

  it('handles a plan with no budget and no items', () => {
    const event = eventWith([], { budget: 0 });
    const summary = computeBudgetSummary(event);
    expect(summary.projected).toBe(0);
    expect(summary.overBy).toBe(0);
    expect(summary.perGuest).toBe(0);
    expect(() => recommendSavings(event, summary)).not.toThrow();
  });
});
