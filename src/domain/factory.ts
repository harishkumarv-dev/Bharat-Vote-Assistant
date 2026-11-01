import { ACCESSIBILITY_NEEDS, DIETARY_NEEDS, PRIORITIES, STYLE_TAGS } from '../types';
import type {
  AccessibilityNeed,
  CurrencyCode,
  DietaryNeed,
  EventDraft,
  EventPlan,
  Priority,
  StyleTag,
  Workspace,
} from '../types';
import { CURRENCIES, EVENT_TYPES } from '../types';
import { addDaysIso, isValidIsoDate, todayIso } from './dates';
import { allocateBudget } from './budget';
import { buildLocalConcept } from './plan';
import { buildTimeline, sortTasks } from './timeline';
import { createGuest } from './guests';
import { createVendor } from './vendors';
import { EVENT_TYPE_META } from './catalog';
import { cleanText, createId } from '../utils';

function oneOf<T extends string>(value: string, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function cleanList<T extends string>(
  values: string[],
  allowed: readonly T[],
): T[] {
  return Array.from(new Set(values.filter((value): value is T => allowed.includes(value as T))));
}

export function sanitizeDraft(draft: EventDraft): EventDraft {
  const type = oneOf(draft.type, EVENT_TYPES, 'wedding');
  const name = cleanText(draft.name || EVENT_TYPE_META[type].defaultName, 80);
  const date = isValidIsoDate(draft.date) ? draft.date : addDaysIso(todayIso(), 90);
  return {
    type,
    name,
    date,
    location: cleanText(draft.location, 100),
    guestCount: Math.min(2000, Math.max(1, Math.round(draft.guestCount) || 1)),
    budget: Math.min(100_000_000, Math.max(0, Math.round(draft.budget) || 0)),
    currency: oneOf<CurrencyCode>(draft.currency, CURRENCIES, 'USD'),
    priorities: cleanList<Priority>(draft.priorities, PRIORITIES),
    styles: cleanList<StyleTag>(draft.styles, STYLE_TAGS),
    dietary: cleanList<DietaryNeed>(draft.dietary, DIETARY_NEEDS),
    accessibility: cleanList<AccessibilityNeed>(draft.accessibility, ACCESSIBILITY_NEEDS),
    notes: cleanText(draft.notes, 600),
  };
}

export function createEvent(draft: EventDraft, now: Date = new Date()): EventPlan {
  const safe = sanitizeDraft(draft);
  const id = createId('event');
  const timestamp = now.toISOString();
  const seed = {
    id,
    type: safe.type,
    basics: {
      name: safe.name,
      date: safe.date,
      location: safe.location,
      guestCount: safe.guestCount,
      budget: safe.budget,
      currency: safe.currency,
    },
    vibe: {
      priorities: safe.priorities,
      styles: safe.styles,
      notes: safe.notes,
      dietary: safe.dietary,
      accessibility: safe.accessibility,
    },
  };
  const concept = buildLocalConcept(seed);

  return {
    id,
    type: safe.type,
    basics: seed.basics,
    vibe: seed.vibe,
    budget: { items: allocateBudget(safe.budget, safe.type) },
    guests: [],
    vendors: [],
    tasks: buildTimeline(safe.type, safe.date, now),
    concept: concept.concept,
    ideas: concept.ideas,
    aiNotes: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export const SAMPLE_DRAFT: Omit<EventDraft, 'date'> = {
  type: 'wedding',
  name: 'Maya & Arjun’s garden wedding',
  location: 'Hudson Valley, NY',
  guestCount: 110,
  budget: 32_000,
  currency: 'USD',
  priorities: ['food', 'photos', 'experiences', 'accessibility'],
  styles: ['outdoor', 'classic', 'minimal'],
  dietary: ['vegetarian', 'gluten-free'],
  accessibility: ['step-free', 'quiet-room', 'accessible-parking'],
  notes:
    'A relaxed outdoor celebration with a long shared dinner. We want a quiet room and a step-free route, and we are keeping the ceremony short.',
};

export function createSampleEvent(now: Date = new Date()): EventPlan {
  const draft: EventDraft = {
    ...SAMPLE_DRAFT,
    date: addDaysIso(todayIso(now), 180),
  };
  const event = createEvent(draft, now);

  const sampleGuests = [
    { name: 'Priya Raman', group: 'Family', rsvp: 'attending' as const, plusOnes: 1, dietary: ['vegetarian'] as DietaryNeed[], notes: 'Arriving Friday' },
    { name: 'Daniel Okafor', group: 'Friends', rsvp: 'attending' as const, plusOnes: 1, dietary: [] as DietaryNeed[], notes: '' },
    { name: 'Elena Rossi', group: 'Family', rsvp: 'maybe' as const, plusOnes: 0, dietary: ['gluten-free'] as DietaryNeed[], notes: 'Checking travel' },
    { name: 'Marcus Chen', group: 'Work', rsvp: 'pending' as const, plusOnes: 1, dietary: [] as DietaryNeed[], notes: '' },
    { name: 'Aisha Bello', group: 'Friends', rsvp: 'attending' as const, plusOnes: 0, dietary: ['vegetarian', 'dairy-free'] as DietaryNeed[], notes: '' },
    { name: 'Tom Gallagher', group: 'Family', rsvp: 'declined' as const, plusOnes: 0, dietary: [] as DietaryNeed[], notes: 'Abroad' },
    { name: 'Noor Haddad', group: 'Friends', rsvp: 'pending' as const, plusOnes: 0, dietary: ['halal'] as DietaryNeed[], notes: '' },
    { name: 'Ruth & Ben Adler', group: 'Family', rsvp: 'attending' as const, plusOnes: 0, dietary: ['kid-friendly'] as DietaryNeed[], notes: 'Bringing two children' },
  ];
  event.guests = sampleGuests.map((guest) => createGuest(guest));

  const venue = createVendor('wedding', {
    name: 'Stone Barn at Willow Creek',
    category: 'venue',
    status: 'booked',
    quote: 7600,
    contactName: 'Lena Ortiz',
    email: 'hello@stonebarn.example',
    followUp: addDaysIso(todayIso(now), 20),
    notes: 'Includes tables, chairs, and the courtyard. Step-free route confirmed.',
  });
  const catering = createVendor('wedding', {
    name: 'Sage & Salt Catering',
    category: 'catering',
    status: 'quoted',
    quote: 9400,
    contactName: 'Owen Park',
    email: 'events@sageandsalt.example',
    followUp: addDaysIso(todayIso(now), 7),
    notes: 'Tasting booked. Asked for a fully vegetarian option and allergy protocol.',
  });
  const photography = createVendor('wedding', {
    name: 'Northlight Studio',
    category: 'photography',
    status: 'contacted',
    quote: 3200,
    contactName: 'Imani Clarke',
    email: 'studio@northlight.example',
    notes: 'Waiting on a full gallery from a similar outdoor wedding.',
  });
  const florist = createVendor('wedding', {
    name: 'Wild Stem Co.',
    category: 'flowers',
    status: 'booked',
    quote: 1800,
    contactName: 'Jo Ellis',
    email: 'jo@wildstem.example',
    notes: 'Seasonal stems only. Reusing ceremony arrangements at dinner.',
  });
  event.vendors = [venue, catering, photography, florist];

  // Make the sample feel like a plan in motion, not a blank template.
  const doneTitles = new Set([
    'Set the budget and guest count',
    'Book the venue',
    'Send save-the-dates',
  ]);
  event.tasks = sortTasks(
    event.tasks.map((task) => (doneTitles.has(task.title) ? { ...task, done: true } : task)),
  );

  const venueItem = event.budget.items.find((item) => item.category === 'venue');
  if (venueItem) {
    venueItem.actual = 7600;
    venueItem.paid = true;
    venueItem.notes = 'Signed contract; deposit paid.';
  }
  const cateringItem = event.budget.items.find((item) => item.category === 'catering');
  if (cateringItem) {
    cateringItem.actual = 9400;
    cateringItem.notes = 'Quote received; final headcount due 21 days out.';
  }
  const photoItem = event.budget.items.find((item) => item.category === 'photography');
  if (photoItem) {
    photoItem.actual = 3200;
  }

  return event;
}

export function initialWorkspace(now: Date = new Date()): Workspace {
  const event = createSampleEvent(now);
  return {
    schemaVersion: 1,
    activeEventId: event.id,
    events: [event],
  };
}

export function emptyWorkspace(): Workspace {
  return { schemaVersion: 1, activeEventId: null, events: [] };
}
