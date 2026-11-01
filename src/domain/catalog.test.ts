import { describe, expect, it } from 'vitest';
import {
  BUDGET_CATEGORIES,
  BUDGET_TIPS,
  COST_BAND_LABELS,
  DIETARY_LABELS,
  EFFORT_LABELS,
  EVENT_TYPE_META,
  PHASE_LABELS,
  PHASE_ORDER,
  PRIORITY_LABELS,
  STYLE_LABELS,
  TIMELINE_TEMPLATES,
  VENDOR_CATEGORIES,
  budgetCategory,
  vendorCategory,
} from './catalog';
import type { EventType } from '../types';

describe('domain/catalog', () => {
  const eventTypes: EventType[] = ['wedding', 'birthday', 'community'];

  it('defines metadata for all three event types', () => {
    for (const type of eventTypes) {
      const meta = EVENT_TYPE_META[type];
      expect(meta).toBeDefined();
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(meta.defaultName.length).toBeGreaterThan(0);
      expect(meta.example.length).toBeGreaterThan(0);
    }
  });

  it('defines human-readable labels for priorities, styles, and diet', () => {
    expect(PRIORITY_LABELS.food).toContain('Food');
    expect(PRIORITY_LABELS.venue).toContain('Venue');
    expect(PRIORITY_LABELS.accessibility).toContain('Inclusive');

    expect(STYLE_LABELS.modern).toBe('Modern');
    expect(STYLE_LABELS.minimal).toBe('Minimal');
    expect(STYLE_LABELS.bohemian).toBe('Bohemian');

    expect(DIETARY_LABELS.vegetarian).toBe('Vegetarian');
    expect(DIETARY_LABELS['gluten-free']).toBe('Gluten-free');

    expect(COST_BAND_LABELS.free).toBe('No added cost');
    expect(EFFORT_LABELS.low).toBe('Easy to do');
  });

  it('defines phases and phase ordering', () => {
    expect(PHASE_ORDER).toEqual(['foundation', 'bookings', 'details', 'final', 'event']);
    expect(PHASE_LABELS.foundation).toBe('Foundation');
    expect(PHASE_LABELS.event).toBe('Event day');
  });

  it('has balanced budget categories and helper function for all event types', () => {
    for (const type of eventTypes) {
      const categories = BUDGET_CATEGORIES[type];
      expect(categories.length).toBeGreaterThan(3);

      const totalShare = categories.reduce((sum, c) => sum + c.share, 0);
      expect(totalShare).toBeGreaterThan(80);
      expect(totalShare).toBeLessThanOrEqual(105);

      for (const cat of categories) {
        expect(cat.id.length).toBeGreaterThan(0);
        expect(cat.label.length).toBeGreaterThan(0);
        expect(cat.color.startsWith('#')).toBe(true);

        const fetched = budgetCategory(type, cat.id);
        expect(fetched).toEqual(cat);
      }
    }
  });

  it('has vendor categories and helper function with questions for all event types', () => {
    for (const type of eventTypes) {
      const vendors = VENDOR_CATEGORIES[type];
      expect(vendors.length).toBeGreaterThan(3);

      for (const v of vendors) {
        expect(v.id.length).toBeGreaterThan(0);
        expect(v.label.length).toBeGreaterThan(0);
        expect(v.questions.length).toBeGreaterThan(0);

        const fetched = vendorCategory(type, v.id);
        expect(fetched).toEqual(v);
      }
    }
  });

  it('provides timeline templates covering foundation, bookings, and details', () => {
    for (const type of eventTypes) {
      const templates = TIMELINE_TEMPLATES[type];
      expect(templates.length).toBeGreaterThan(3);

      for (const t of templates) {
        expect(t.title.length).toBeGreaterThan(0);
        expect(t.description.length).toBeGreaterThan(0);
        expect(typeof t.offsetDays).toBe('number');
        expect(['high', 'medium', 'low']).toContain(t.priority);
      }
    }
  });

  it('provides curated budget tips for each celebration type', () => {
    for (const type of eventTypes) {
      const tips = BUDGET_TIPS[type];
      expect(tips.length).toBeGreaterThan(0);
      for (const tip of tips) {
        expect(tip.title.length).toBeGreaterThan(0);
        expect(tip.detail.length).toBeGreaterThan(0);
      }
    }
  });
});
