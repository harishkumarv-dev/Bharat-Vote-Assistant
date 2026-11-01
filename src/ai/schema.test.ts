import { describe, expect, it } from 'vitest';
import {
  aiBudgetSchema,
  aiEmailSchema,
  aiPlanSchema,
  extractJsonObject,
  toConceptResult,
} from './schema';

const validPlan = {
  concept: {
    title: 'Test concept',
    summary: 'A thoughtful concept shaped around the event and its real constraints.',
    palette: ['#112233', '#445566', '#778899'],
    signatureMoments: ['A calm welcome', 'A shared dinner'],
  },
  ideas: [
    {
      title: 'Idea one',
      description: 'A practical idea with genuine detail for this event.',
      category: 'Guest experience',
      costBand: 'low',
      effort: 'medium',
      tags: ['food', 'food', 'outdoor'],
      whyItFits: 'It connects to the stated priorities.',
    },
    {
      title: 'Idea two',
      description: 'A second practical idea with genuine detail.',
      category: 'Decor',
      costBand: 'free',
      effort: 'low',
      tags: ['decor'],
      whyItFits: 'It makes the room feel intentional.',
    },
    {
      title: 'Idea three',
      description: 'A third practical idea with genuine detail.',
      category: 'Accessibility',
      costBand: 'medium',
      effort: 'high',
      tags: ['accessibility'],
      whyItFits: 'It includes more guests.',
    },
  ],
  budgetTips: [
    { title: 'Trim transport', detail: 'Use one shuttle rather than three.', savings: 200 },
  ],
  timelineTips: ['Confirm the final headcount'],
  vendorTips: ['Ask for the out-the-door price'],
};

describe('AI response schemas', () => {
  it('accepts a complete plan payload', () => {
    const parsed = aiPlanSchema.parse(validPlan);
    expect(parsed.ideas).toHaveLength(3);
    expect(parsed.budgetTips[0].savings).toBe(200);
  });

  it('rejects short, malformed, or unsafe plan payloads', () => {
    expect(() =>
      aiPlanSchema.parse({
        ...validPlan,
        concept: { ...validPlan.concept, palette: ['red', '#000000', '#ffffff'] },
      }),
    ).toThrow();
    expect(() =>
      aiPlanSchema.parse({ ...validPlan, ideas: validPlan.ideas.slice(0, 2) }),
    ).toThrow();
    expect(() =>
      aiPlanSchema.parse({ ...validPlan, ideas: [{ ...validPlan.ideas[0], costBand: 'cheap' }] }),
    ).toThrow();
    expect(() =>
      aiPlanSchema.parse({ ...validPlan, budgetTips: [{ title: 'x', detail: 'y', savings: -1 }] }),
    ).toThrow();
  });

  it('validates budget and email payloads', () => {
    expect(
      aiBudgetSchema.parse({
        summary: 'A short but useful budget summary.',
        tips: [{ title: 'Switch caterer', detail: 'Compare three quotes.', savings: null }],
      }).tips,
    ).toHaveLength(1);
    expect(() => aiBudgetSchema.parse({ summary: 'Too short', tips: [] })).toThrow();
    expect(
      aiEmailSchema.parse({ subject: 'Availability enquiry', body: 'A friendly and specific draft.' }),
    ).toBeTruthy();
    expect(() => aiEmailSchema.parse({ subject: 'Hi', body: 'x' })).toThrow();
  });
});

describe('toConceptResult', () => {
  it('maps ideas and deduplicates tags without losing source', () => {
    const parsed = aiPlanSchema.parse(validPlan);
    const result = toConceptResult(parsed);
    expect(result.concept.source).toBe('ai');
    expect(result.ideas).toHaveLength(3);
    expect(result.ideas[0].source).toBe('ai');
    expect(result.ideas[0].pinned).toBe(false);
    expect(result.ideas[0].tags).toEqual(['food', 'outdoor']);
    expect(new Set(result.ideas.map((idea) => idea.id)).size).toBe(3);
    expect(result.budgetTips).toEqual(parsed.budgetTips);
    expect(result.timelineTips).toEqual(parsed.timelineTips);
    expect(result.vendorTips).toEqual(parsed.vendorTips);
  });
});

describe('extractJsonObject', () => {
  it('tolerates fences and surrounding commentary', () => {
    expect(extractJsonObject('```json\n{"ok":true}\n```')).toEqual({ ok: true });
    expect(extractJsonObject('Here is the plan: {"ok":true} — enjoy.')).toEqual({ ok: true });
    expect(extractJsonObject('  {"nested":{"a":1}}  ')).toEqual({ nested: { a: 1 } });
  });

  it('throws useful errors for missing or malformed JSON', () => {
    expect(() => extractJsonObject('No object here')).toThrow(/did not return JSON/);
    expect(() => extractJsonObject('{"broken": }')).toThrow();
    expect(() => extractJsonObject('{"before":1} text {"after":2}')).toThrow();
  });
});
