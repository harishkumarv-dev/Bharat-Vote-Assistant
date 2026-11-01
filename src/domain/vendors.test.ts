import { describe, expect, it } from 'vitest';
import type { EventDraft } from '../types';
import { VENDOR_CATEGORIES } from './catalog';
import { createEvent } from './factory';
import {
  computeVendorStats,
  createVendor,
  defaultVendorChecklist,
  draftVendorEmail,
  missingEssentialVendors,
  vendorCategoryLabel,
} from './vendors';

const FIXED_NOW = new Date(2026, 10, 1, 10, 0, 0);

function draft(overrides: Partial<EventDraft> = {}): EventDraft {
  return {
    type: 'wedding',
    name: 'Maya & Arjun’s garden wedding',
    date: '2027-05-01',
    location: 'Hudson Valley, NY',
    guestCount: 110,
    budget: 32_000,
    currency: 'USD',
    priorities: ['food', 'photos'],
    styles: ['outdoor'],
    dietary: [],
    accessibility: [],
    notes: '',
    ...overrides,
  };
}

describe('createVendor', () => {
  it('cleans input, clamps quotes, and assigns the category checklist', () => {
    const vendor = createVendor('wedding', {
      name: '  Stone   Barn  ',
      category: 'venue',
      quote: 7600.7,
      contactName: ' Lena ',
      email: ' hello@stonebarn.example ',
      phone: ' 555 0100 ',
      notes: ' Step-free route ',
    });

    expect(vendor.name).toBe('Stone Barn');
    expect(vendor.quote).toBe(7601);
    expect(vendor.status).toBe('researching');
    expect(vendor.contactName).toBe('Lena');
    expect(vendor.checklist).toHaveLength(
      VENDOR_CATEGORIES.wedding.find((category) => category.id === 'venue')!.questions.length,
    );
    expect(vendor.checklist.every((item) => item.done === false)).toBe(true);
  });

  it('normalises missing and invalid values', () => {
    const vendor = createVendor('birthday', {
      name: 'Cake maker',
      category: 'cake',
      quote: Number.NaN,
    });
    expect(vendor.quote).toBeNull();
    expect(vendor.email).toBe('');
    expect(vendor.followUp).toBe('');
    expect(vendor.checklist.length).toBeGreaterThan(0);

    const negative = createVendor('community', {
      name: 'Safety lead',
      category: 'safety',
      quote: -20,
    });
    expect(negative.quote).toBe(0);
    expect(defaultVendorChecklist('not-a-type' as never, 'safety')).toEqual([]);
  });
});

describe('vendor readiness', () => {
  it('tracks booked essentials and mixed pipeline statuses', () => {
    const event = createEvent(draft(), FIXED_NOW);
    const venue = createVendor('wedding', {
      name: 'Stone Barn',
      category: 'venue',
      status: 'booked',
      quote: 7600,
    });
    const catering = createVendor('wedding', {
      name: 'Sage & Salt',
      category: 'catering',
      status: 'quoted',
      quote: 9400,
    });
    const photography = createVendor('wedding', {
      name: 'Northlight',
      category: 'photography',
      status: 'contacted',
      quote: 3200,
    });
    const florist = createVendor('wedding', {
      name: 'Wild Stem',
      category: 'flowers',
      status: 'declined',
    });
    event.vendors = [venue, catering, photography, florist];

    const stats = computeVendorStats(event);
    expect(stats.categories).toHaveLength(VENDOR_CATEGORIES.wedding.length);
    expect(stats.essentialTotal).toBe(4);
    expect(stats.essentialBooked).toBe(1);
    expect(stats.booked).toBe(1);
    expect(stats.quoted).toBe(1);
    expect(stats.contacted).toBe(1);
    expect(stats.researching).toBe(0);
    expect(stats.declined).toBe(1);
    expect(stats.quotedValue).toBe(20_200);
    expect(missingEssentialVendors(stats).map((entry) => entry.id)).toEqual([
      'catering',
      'photography',
      'officiant',
    ]);
  });

  it('counts a category as ready once any vendor in it is booked', () => {
    const event = createEvent(draft(), FIXED_NOW);
    event.vendors = [
      createVendor('wedding', { name: 'First venue', category: 'venue' }),
      createVendor('wedding', { name: 'Second venue', category: 'venue', status: 'booked' }),
    ];
    const stats = computeVendorStats(event);
    const venue = stats.categories.find((entry) => entry.id === 'venue');
    expect(venue).toMatchObject({ booked: true, vendorCount: 2 });
  });

  it('labels unknown categories safely', () => {
    expect(vendorCategoryLabel('wedding', 'venue')).toBe('Venue');
    expect(vendorCategoryLabel('wedding', 'unknown')).toBe('Other');
  });
});

describe('draftVendorEmail', () => {
  it('builds a specific, safe enquiry with optional context', () => {
    const event = createEvent(draft(), FIXED_NOW);
    const vendor = createVendor('wedding', {
      name: 'Stone Barn',
      category: 'venue',
      contactName: 'Lena Ortiz',
      quote: 7600,
    });

    const draftEmail = draftVendorEmail(event, vendor, 'Please ask about step-free access.');
    expect(draftEmail.subject).toBe('Maya & Arjun’s garden wedding — venue enquiry');
    expect(draftEmail.body).toContain('Hi Lena Ortiz,');
    expect(draftEmail.body).toContain('on 2027-05-01 in Hudson Valley, NY');
    expect(draftEmail.body).toContain('about 110 guests');
    expect(draftEmail.body).toContain('Availability for our date');
    expect(draftEmail.body).toContain('accessibility or dietary considerations');
    expect(draftEmail.body).toContain('Please ask about step-free access.');
    expect(draftEmail.body).toContain('[Your name]');
  });

  it('falls back to the business name and omits blank extra context', () => {
    const event = createEvent(draft({ location: '' }), FIXED_NOW);
    const vendor = createVendor('birthday', {
      name: 'Cake Studio',
      category: 'cake',
      contactName: '',
    });
    event.type = 'birthday';
    const draftEmail = draftVendorEmail(event, vendor, '   ');
    expect(draftEmail.body.startsWith('Hi Cake Studio,')).toBe(true);
    expect(draftEmail.body).not.toContain(' in ');
    expect(draftEmail.body.split('\n\n').length).toBeGreaterThan(2);
  });
});
