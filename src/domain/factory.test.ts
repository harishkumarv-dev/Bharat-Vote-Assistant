import { describe, expect, it } from 'vitest';
import {
  createEvent,
  createSampleEvent,
  emptyWorkspace,
  initialWorkspace,
  sanitizeDraft,
} from './factory';

const FIXED_NOW = new Date(2026, 10, 1, 10, 0, 0);

describe('event factory and workspace lifecycle', () => {
  it('sanitizes drafts with safe bounds and fallbacks', () => {
    const sanitized = sanitizeDraft({
      type: 'wedding',
      name: '',
      date: 'invalid-date',
      location: 'Garden Estate',
      guestCount: -50,
      budget: -1000,
      currency: 'USD',
      priorities: ['food', 'music'],
      styles: ['cozy'],
      dietary: ['vegetarian'],
      accessibility: ['step-free'],
      notes: '',
    });

    expect(sanitized.name).toBe('Our wedding');
    expect(sanitized.guestCount).toBe(1);
    expect(sanitized.budget).toBe(0);
    expect(sanitized.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('creates complete event models for all archetypes', () => {
    const wedding = createEvent(
      {
        type: 'wedding',
        name: 'Our Wedding',
        date: '2027-06-15',
        location: 'Lake View',
        guestCount: 120,
        budget: 35000,
        currency: 'USD',
        priorities: ['food'],
        styles: ['classic'],
        dietary: [],
        accessibility: [],
        notes: '',
      },
      FIXED_NOW,
    );

    expect(wedding.type).toBe('wedding');
    expect(wedding.budget.items.length).toBeGreaterThan(0);
    expect(wedding.tasks.length).toBeGreaterThan(0);
    expect(wedding.concept.palette).toHaveLength(5);
  });

  it('creates sample workspace and empty workspace correctly', () => {
    const initial = initialWorkspace(FIXED_NOW);
    expect(initial.schemaVersion).toBe(1);
    expect(initial.events).toHaveLength(1);
    expect(initial.activeEventId).toBe(initial.events[0].id);

    const empty = emptyWorkspace();
    expect(empty.schemaVersion).toBe(1);
    expect(empty.activeEventId).toBeNull();
    expect(empty.events).toHaveLength(0);
  });

  it('creates sample event with realistic initial status and actuals', () => {
    const sample = createSampleEvent(FIXED_NOW);
    expect(sample.basics.name).toBe('Maya & Arjun’s garden wedding');
    expect(sample.basics.budget).toBe(32000);
    expect(sample.guests.length).toBe(8);
    expect(sample.vendors.length).toBe(4);
    expect(sample.tasks.some((t) => t.done)).toBe(true);
  });
});
