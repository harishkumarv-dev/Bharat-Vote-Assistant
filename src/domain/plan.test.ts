import { describe, expect, it } from 'vitest';
import type { EventDraft, EventPlan } from '../types';
import { createEvent } from './factory';
import {
  buildLocalConcept,
  buildLocalIdeas,
  eventBrief,
  isUpcoming,
  localBudgetTips,
  localCoachReply,
  totalPlanned,
} from './plan';

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
    priorities: ['food', 'photos', 'accessibility'],
    styles: ['outdoor', 'classic', 'minimal'],
    dietary: ['vegetarian', 'gluten-free'],
    accessibility: ['step-free', 'quiet-room'],
    notes: 'A relaxed outdoor celebration with a long shared dinner.',
    ...overrides,
  };
}

function event(overrides: Partial<EventDraft> = {}): EventPlan {
  return createEvent(draft(overrides), FIXED_NOW);
}

describe('local concept generation', () => {
  it('is deterministic for the same brief', () => {
    const first = event();
    const second = event();
    const firstConcept = buildLocalConcept(first);
    const secondConcept = buildLocalConcept(second);

    expect(firstConcept.concept.title).toBe(secondConcept.concept.title);
    expect(firstConcept.concept.summary).toBe(secondConcept.concept.summary);
    expect(firstConcept.concept.signatureMoments).toEqual(
      secondConcept.concept.signatureMoments,
    );
    expect(firstConcept.ideas.map((idea) => idea.title)).toEqual(
      secondConcept.ideas.map((idea) => idea.title),
    );
    expect(firstConcept.concept.source).toBe('local');
  });

  it('reflects the brief, budget tier, and access needs', () => {
    const result = buildLocalConcept(event());
    expect(result.concept.title.length).toBeGreaterThan(2);
    expect(result.concept.summary).toContain('May');
    expect(result.concept.summary).toContain('110 guests');
    expect(result.concept.summary).toContain('Access needs are written into the brief');
    expect(result.concept.summary).toContain('dietary need');
    expect(result.concept.palette.length).toBeGreaterThanOrEqual(3);
    expect(result.concept.signatureMoments.length).toBeGreaterThanOrEqual(3);
    expect(result.ideas).toHaveLength(6);
    expect(result.ideas.every((idea) => idea.source === 'local' && !idea.pinned)).toBe(true);
  });

  it('handles a zero-budget, no-style brief with practical ideas', () => {
    const result = buildLocalConcept(
      event({
        budget: 0,
        guestCount: 1,
        priorities: [],
        styles: [],
        dietary: [],
        accessibility: [],
        notes: '',
      }),
    );
    expect(result.concept.summary).toContain('borrowed, shared, and free touches');
    expect(result.concept.summary).not.toContain('Access needs');
    expect(result.ideas.length).toBe(6);
  });
});

describe('local idea generation', () => {
  it('limits category repetition and explains the fit', () => {
    const ideas = buildLocalIdeas(event());
    const counts = new Map<string, number>();
    for (const idea of ideas) {
      counts.set(idea.category, (counts.get(idea.category) ?? 0) + 1);
    }
    expect(ideas).toHaveLength(6);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
    expect(ideas.every((idea) => idea.whyItFits.length > 10)).toBe(true);
    expect(ideas.some((idea) => idea.whyItFits.startsWith('Because you chose'))).toBe(true);
  });

  it('favours lower-cost ideas when the budget is lean', () => {
    const lean = buildLocalIdeas(event({ budget: 900, guestCount: 100 }));
    const premium = buildLocalIdeas(event({ budget: 90_000, guestCount: 100 }));
    const leanScore = lean.filter((idea) => idea.costBand === 'free' || idea.costBand === 'low')
      .length;
    const premiumSplurge = premium.filter((idea) => idea.costBand === 'splurge').length;
    expect(leanScore).toBeGreaterThanOrEqual(3);
    expect(premiumSplurge).toBeGreaterThanOrEqual(0);
  });
});

describe('local coach', () => {
  it('starts with a plan-aware greeting', () => {
    const reply = localCoachReply(event(), 'hello');
    expect(reply.reply).toContain('Maya & Arjun’s garden wedding');
    expect(reply.reply).toContain('Plan confidence is');
    expect(reply.followUps.length).toBeGreaterThanOrEqual(3);
  });

  it('answers budget questions with real figures and next levers', () => {
    const reply = localCoachReply(event(), 'How can I save money on the budget?');
    expect(reply.reply).toContain('$32,000');
    expect(reply.reply).toContain('per guest');
    expect(reply.reply).toContain('The most useful levers');
    expect(reply.followUps).toContain('Rebalance the plan');
  });

  it('answers guest, vendor, timeline, access, and sustainability questions', () => {
    const populated = event();
    populated.guests = [
      {
        id: 'guest_1',
        name: 'A guest',
        email: '',
        group: 'Family',
        rsvp: 'attending',
        plusOnes: 1,
        dietary: ['vegetarian'],
        notes: '',
      },
    ];
    const guestReply = localCoachReply(populated, 'How many guests have replied?');
    expect(guestReply.reply).toContain('invitations');

    const vendorReply = localCoachReply(populated, 'Which vendors should I book?');
    expect(vendorReply.reply).toContain('booked');
    expect(vendorReply.reply).toContain('Essentials still open');

    const timelineReply = localCoachReply(populated, 'What is next on my timeline?');
    expect(timelineReply.reply).toContain('milestones complete');

    const accessReply = localCoachReply(populated, 'Tell me about accessibility');
    expect(accessReply.reply).toContain('Step-free access');
    expect(accessReply.reply).toContain('cross-contamination');

    const greenReply = localCoachReply(populated, 'How can I reduce waste?');
    expect(greenReply.reply).toContain('borrow instead of buy');
  });

  it('handles empty guest lists and empty idea lists', () => {
    const empty = event();
    empty.guests = [];
    empty.ideas = [];
    const guestReply = localCoachReply(empty, 'Check my guest list');
    expect(guestReply.reply).toContain('guest list is empty');
    const ideaReply = localCoachReply(empty, 'Give me a personal idea');
    expect(ideaReply.reply).toContain('does not have any ideas yet');
    expect(ideaReply.followUps).toContain('Regenerate my concept');
  });

  it('falls back helpfully for help and unknown messages', () => {
    const help = localCoachReply(event(), 'What can you do?');
    expect(help.reply).toContain('review the budget');
    const unknown = localCoachReply(event(), 'Something entirely different');
    expect(unknown.reply).toContain('I can help with that');
    expect(unknown.followUps.length).toBeGreaterThan(0);
  });

  it('returns at most four local budget tips', () => {
    const tips = localBudgetTips(event());
    expect(tips.length).toBeGreaterThan(0);
    expect(tips.length).toBeLessThanOrEqual(4);
    expect(tips.every((tip) => tip.title && tip.detail)).toBe(true);
  });
});

describe('eventBrief', () => {
  it('summarises the plan without guest rows or pasted contact details', () => {
    const sample = event();
    sample.guests = [
      {
        id: 'guest_1',
        name: 'Private Person',
        email: 'private@example.com',
        group: 'Family',
        rsvp: 'attending',
        plusOnes: 1,
        dietary: ['vegan'],
        notes: 'Call 555 123 4567',
      },
    ];
    sample.vibe.notes = 'Reach me at maya@example.com or +1 (555) 123-4567.';
    const brief = eventBrief(sample);

    expect(brief).toContain('Maya & Arjun’s garden wedding');
    expect(brief).toContain('Guests: 110 planned; 1 attending');
    expect(brief).toContain('Budget: 32000 USD');
    expect(brief).toContain('Next tasks:');
    expect(brief).toContain('[email removed]');
    expect(brief).toContain('[phone removed]');
    expect(brief).not.toContain('Private Person');
    expect(brief).not.toContain('private@example.com');
    expect(brief).not.toContain('555 123 4567');
  });

  it('reports missing values without throwing', () => {
    const empty = event({ location: '', notes: '', priorities: [], styles: [] });
    empty.ideas = [];
    empty.tasks = [];
    empty.guests = [];
    const brief = eventBrief(empty);
    expect(brief).toContain('Location: not set');
    expect(brief).toContain('Priorities: not set');
    expect(brief).toContain('Ideas already saved: none');
    expect(brief).toContain('Next tasks: none');
  });
});

describe('plan helpers', () => {
  it('totals planned spend and checks whether an event is upcoming', () => {
    const sample = event();
    expect(totalPlanned(sample)).toBe(32_000);
    expect(isUpcoming(sample, FIXED_NOW)).toBe(true);
    expect(isUpcoming(event({ date: '2026-10-01' }), FIXED_NOW)).toBe(false);
  });
});
