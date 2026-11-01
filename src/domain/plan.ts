import {
  ACCESSIBILITY_LABELS,
  CONCEPT_TEMPLATES,
  DIETARY_LABELS,
  IDEA_POOL,
  PRIORITY_LABELS,
  STYLE_LABELS,
  type ConceptTemplate,
  type IdeaTag,
  type IdeaTemplate,
} from './catalog';
import { recommendSavings, computeBudgetSummary } from './budget';
import { formatDate, relativeDayLabel, todayIso } from './dates';
import { formatMoney, sum } from './money';
import { computeGuestStats } from './guests';
import { buildInsights, computePlanHealth } from './health';
import { computeTimelineStats, sortTasks } from './timeline';
import { computeVendorStats, missingEssentialVendors } from './vendors';
import type {
  AiBudgetTip,
  Concept,
  ConceptResult,
  CostBand,
  EventPlan,
  Idea,
  Priority,
  StyleTag,
} from '../types';
import { createId, pickDeterministic, redactContactDetails } from '../utils';

type PlanSeed = Pick<EventPlan, 'id' | 'type' | 'basics' | 'vibe'>;

const MOMENT_BY_PRIORITY: Record<Priority, string> = {
  food: 'A menu that makes dietary needs feel intentional, not like an afterthought.',
  music: 'One properly planned music moment — a first dance, a group song, or a live set.',
  decor: 'A single strong visual gesture, repeated with confidence, instead of a room full of props.',
  photos: 'A short, unhurried portrait window in the best light of the day.',
  experiences: 'One interactive moment that gives guests something to do together.',
  venue: 'A setting that does half the decorating for you.',
  guests: 'A clear guest journey, from arrival to the last goodbye, with places to rest.',
  keepsakes: 'Something small and specific that guests take home and actually keep.',
  accessibility: 'A quiet, step-free route and a named person responsible for access on the day.',
  sustainability: 'A visible low-waste choice that guests can see and copy at home.',
};

const DEFAULT_MOMENTS: Record<EventPlan['type'], string[]> = {
  wedding: [
    'A welcome moment that gives guests a drink and a place to land.',
    'A short portrait window timed to the best light.',
    'A final song chosen for the people still standing.',
  ],
  birthday: [
    'One headline moment that the guest of honour actually wants.',
    'A playlist shaped by the people who know them best.',
    'A dessert moment that gets everyone in the same room.',
  ],
  community: [
    'A clear welcome with accessible wayfinding from the entrance.',
    'One shared activity that works for different ages and abilities.',
    'A visible thank-you to the volunteers and neighbours who made it happen.',
  ],
};

function budgetTier(type: EventPlan['type'], budget: number, guests: number): string {
  const perGuest = guests > 0 ? budget / guests : budget;
  const thresholds =
    type === 'wedding'
      ? { lean: 120, premium: 300 }
      : type === 'birthday'
        ? { lean: 40, premium: 100 }
        : { lean: 15, premium: 40 };
  if (perGuest < thresholds.lean) return 'lean';
  if (perGuest > thresholds.premium) return 'premium';
  return 'balanced';
}

function matchConcept(
  type: EventPlan['type'],
  seed: string,
  styles: StyleTag[],
  priorities: Priority[],
): ConceptTemplate {
  const templates = CONCEPT_TEMPLATES[type];
  const scored = templates.map((template) => {
    const styleScore = template.styles.filter((style) => styles.includes(style)).length * 3;
    const priorityScore = template.priorities.filter((priority) =>
      priorities.includes(priority),
    ).length * 2;
    return { template, score: styleScore + priorityScore };
  });
  const bestScore = Math.max(...scored.map((entry) => entry.score));
  const best = scored.filter((entry) => entry.score === bestScore).map((entry) => entry.template);
  return best.length === 1 ? best[0] : pickDeterministic(best, seed);
}

function signatureMoments(seed: PlanSeed): string[] {
  const chosen = seed.vibe.priorities.slice(0, 3).map((priority) => MOMENT_BY_PRIORITY[priority]);
  if (seed.vibe.accessibility.length > 0 && chosen.length < 4) {
    chosen.push(MOMENT_BY_PRIORITY.accessibility);
  }
  for (const fallback of DEFAULT_MOMENTS[seed.type]) {
    if (chosen.length >= 3) break;
    if (!chosen.includes(fallback)) chosen.push(fallback);
  }
  return chosen.slice(0, 4);
}

export function buildLocalConcept(seed: PlanSeed): ConceptResult {
  const template = matchConcept(
    seed.type,
    `${seed.id}:${seed.basics.name}:${seed.vibe.styles.join(',')}`,
    seed.vibe.styles,
    seed.vibe.priorities,
  );
  const month = formatDate(seed.basics.date, { month: 'long' });
  const focus = seed.vibe.priorities.slice(0, 2).map((priority) => PRIORITY_LABELS[priority]);
  const focusText =
    focus.length > 0 ? `The focus lands on ${focus.join(' and ').toLowerCase()}.` : 'The plan keeps the essentials generous and the extras flexible.';
  const tier = budgetTier(seed.type, seed.basics.budget, seed.basics.guestCount);
  const perGuest =
    seed.basics.guestCount > 0
      ? Math.round(seed.basics.budget / seed.basics.guestCount)
      : seed.basics.budget;
  const budgetText =
    seed.basics.budget > 0
      ? `At roughly ${formatMoney(perGuest, seed.basics.currency)} per guest, it has a ${tier} shape.`
      : 'With no budget set yet, the first version leans on borrowed, shared, and free touches.';
  const accessText =
    seed.vibe.accessibility.length > 0
      ? ' Access needs are written into the brief, not added at the end.'
      : '';
  const dietaryText =
    seed.vibe.dietary.length > 0
      ? ' The menu notes make room for every dietary need you listed.'
      : '';

  const concept: Concept = {
    title: template.title,
    summary: `${template.summary} Set for ${seed.basics.guestCount} guests in ${month}, ${focusText} ${budgetText}${accessText}${dietaryText}`,
    palette: template.palette,
    signatureMoments: signatureMoments(seed),
    source: 'local',
  };

  return { concept, ideas: buildLocalIdeas(seed) };
}

function tagLabel(tag: IdeaTag): string {
  if (tag in PRIORITY_LABELS) return PRIORITY_LABELS[tag as Priority].toLowerCase();
  if (tag in STYLE_LABELS) return STYLE_LABELS[tag as StyleTag].toLowerCase();
  const extras: Record<string, string> = {
    kids: 'younger guests',
    seasonal: 'the season',
    stationery: 'stationery',
    'sensory-friendly': 'sensory needs',
  };
  return extras[tag] ?? tag;
}

function scoreIdea(
  idea: IdeaTemplate,
  seed: PlanSeed,
  tier: string,
): number {
  let score = 0;
  for (const tag of idea.tags) {
    if (seed.vibe.priorities.includes(tag as Priority)) score += 4;
    if (seed.vibe.styles.includes(tag as StyleTag)) score += 2;
    if (tag === 'kids' && seed.vibe.dietary.includes('kid-friendly')) score += 2;
    if (tag === 'sensory-friendly' && seed.vibe.accessibility.includes('sensory-friendly')) {
      score += 2;
    }
    if (tag === 'accessibility' && seed.vibe.accessibility.length > 0 && idea.category !== 'Accessibility') {
      score += 1;
    }
  }
  if (seed.vibe.dietary.length > 0 && idea.category === 'Food & drink') score += 1.5;
  if (seed.vibe.accessibility.length > 0 && idea.tags.includes('accessibility')) score += 2;

  const costBands: Record<CostBand, number> =
    tier === 'lean'
      ? { free: 2.5, low: 1.5, medium: -1, splurge: -3 }
      : tier === 'premium'
        ? { free: 0, low: 0.5, medium: 1, splurge: 1.5 }
        : { free: 0.5, low: 1, medium: 1, splurge: -0.5 };
  score += costBands[idea.costBand];

  // Tiny deterministic variation prevents repetitive ordering.
  score += (idea.title.length % 7) / 10;
  return score;
}

export function buildLocalIdeas(seed: PlanSeed): Idea[] {
  const tier = budgetTier(seed.type, seed.basics.budget, seed.basics.guestCount);
  const ranked = IDEA_POOL[seed.type]
    .map((idea) => ({ idea, score: scoreIdea(idea, seed, tier) }))
    .sort((a, b) => b.score - a.score);

  const chosen: IdeaTemplate[] = [];
  const perCategory = new Map<string, number>();
  for (const entry of ranked) {
    const count = perCategory.get(entry.idea.category) ?? 0;
    if (count >= 2) continue;
    chosen.push(entry.idea);
    perCategory.set(entry.idea.category, count + 1);
    if (chosen.length >= 6) break;
  }
  // If category diversity was too restrictive, fill from the remaining ranked list.
  for (const entry of ranked) {
    if (chosen.length >= 6) break;
    if (!chosen.includes(entry.idea)) chosen.push(entry.idea);
  }

  return chosen.map((idea) => {
    const matched = idea.tags
      .filter(
        (tag) =>
          seed.vibe.priorities.includes(tag as Priority) ||
          seed.vibe.styles.includes(tag as StyleTag),
      )
      .slice(0, 3)
      .map(tagLabel);
    const whyItFits =
      matched.length > 0
        ? `Because you chose ${matched.join(', ')}.`
        : 'A practical anchor that leaves room for the rest of the plan.';
    return {
      id: createId('idea'),
      title: idea.title,
      description: idea.description,
      category: idea.category,
      costBand: idea.costBand,
      effort: idea.effort,
      tags: [...idea.tags],
      whyItFits,
      source: 'local' as const,
      pinned: false,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Local coach                                                         */
/* ------------------------------------------------------------------ */

export interface CoachReply {
  reply: string;
  followUps: string[];
}

function money(value: number, event: EventPlan): string {
  return formatMoney(value, event.basics.currency);
}

function budgetReply(event: EventPlan): CoachReply {
  const budget = computeBudgetSummary(event);
  const recs = recommendSavings(event, budget).slice(0, 3);
  const lines = [
    budget.totalBudget > 0
      ? `You've planned ${money(budget.projected, event)} of ${money(budget.totalBudget, event)}${budget.overBy > 0 ? ` — ${money(budget.overBy, event)} over.` : `, leaving ${money(budget.remaining, event)}.`}`
      : 'You have not set a total budget yet. Even a rough ceiling makes the trade-offs easier.',
    `That is about ${money(budget.perGuest, event)} per guest for ${budget.effectiveGuests} people.`,
  ];
  if (recs.length > 0) {
    lines.push('', 'The most useful levers right now:');
    for (const rec of recs) {
      lines.push(`• ${rec.title} — about ${money(rec.savings, event)}. ${rec.detail.split('. ')[0]}.`);
    }
  }
  return {
    reply: lines.join('\n'),
    followUps: ['What is eating my budget?', 'Rebalance the plan', 'Check my guest count'],
  };
}

function guestReply(event: EventPlan): CoachReply {
  const guests = computeGuestStats(event.guests);
  if (guests.invited === 0) {
    return {
      reply:
        'Your guest list is empty. Start with the non-negotiables, then add the people who would make the room feel full. Once RSVPs arrive, I can help you test the headcount against the budget.',
      followUps: ['How much does each guest cost?', 'Who has not replied?', 'Check dietary needs'],
    };
  }
  const lines = [
    `${guests.invited} invitations: ${guests.attending} attending, ${guests.maybe} maybe, ${guests.declined} declined, ${guests.pending} awaiting a reply.`,
    `Confirmed headcount including plus-ones: ${guests.attendingHeadcount}.`,
  ];
  if (guests.dietary.length > 0) {
    lines.push(
      `Dietary tags among attending/maybe guests: ${guests.dietary
        .map((entry) => `${DIETARY_LABELS[entry.need]} ×${entry.count}`)
        .join(', ')}.`,
    );
  }
  if (guests.hasPlusOnes) {
    lines.push('Some guests have plus-ones without their own dietary notes — ask before the final count.');
  }
  lines.push('', 'A firm headcount is the single number your caterer and venue will care about most.');
  return {
    reply: lines.join('\n'),
    followUps: ['Draft a friendly RSVP reminder', 'Check the food budget', 'What dietary needs do I have?'],
  };
}

function vendorReply(event: EventPlan): CoachReply {
  const vendors = computeVendorStats(event);
  const missing = missingEssentialVendors(vendors);
  const lines = [
    `${vendors.booked} booked, ${vendors.quoted} with a quote, ${vendors.contacted} contacted, ${vendors.researching} still being researched.`,
  ];
  if (missing.length > 0) {
    lines.push(
      '',
      `Essentials still open: ${missing.map((category) => category.label).join(', ')}.`,
      'Ask each one the same five questions: availability, what is included, accessibility, cancellation terms, and the full out-the-door price.',
    );
  } else if (vendors.essentialTotal > 0) {
    lines.push('', 'Every essential vendor category has at least one booking. Keep backup contacts and final paperwork in one place.');
  }
  if (vendors.quotedValue > 0) {
    lines.push('', `Recorded quotes total ${money(vendors.quotedValue, event)}. Compare them on what is included, not just the headline.`);
  }
  return {
    reply: lines.join('\n'),
    followUps: ['Draft a vendor email', 'What should I ask the venue?', 'Compare vendor quotes'],
  };
}

function timelineReply(event: EventPlan): CoachReply {
  const timeline = computeTimelineStats(event.tasks, event.basics.date);
  const next = sortTasks(event.tasks.filter((task) => !task.done)).slice(0, 3);
  const lines = [
    `${timeline.done} of ${timeline.total} milestones complete. ${timeline.overdue > 0 ? `${timeline.overdue} overdue.` : 'Nothing overdue.'}`,
  ];
  if (next.length > 0) {
    lines.push('', 'Next up:');
    for (const task of next) {
      lines.push(`• ${task.title} — ${relativeDayLabel(task.due)} (${task.priority} priority)`);
    }
  }
  if (timeline.daysUntilEvent >= 0) {
    lines.push('', `${timeline.daysUntilEvent} days until ${event.basics.name}.`);
  }
  return {
    reply: lines.join('\n'),
    followUps: ['What is overdue?', 'Add the final-week tasks', 'Help me plan the run of show'],
  };
}

function accessibilityReply(event: EventPlan): CoachReply {
  const needs = event.vibe.accessibility.map((need) => ACCESSIBILITY_LABELS[need]);
  const dietary = event.vibe.dietary.map((need) => DIETARY_LABELS[need]);
  const lines: string[] = [];
  lines.push(
    needs.length > 0
      ? `Your brief names: ${needs.join(', ')}. Make each one a specific vendor question and a line in the run-of-show.`
      : 'No accessibility needs are recorded yet. Add the ones you know, then ask the venue for the rest.',
  );
  if (dietary.length > 0) {
    lines.push(
      `Dietary needs in the brief: ${dietary.join(', ')}. For each, ask how the caterer prevents cross-contamination — not just whether they can make an alternative.`,
    );
  }
  lines.push(
    '',
    'Useful defaults: a step-free route from the entrance, one quiet space away from speakers, large-print menus, and a named person responsible for access on the day.',
  );
  return {
    reply: lines.join('\n'),
    followUps: ['Add accessibility to my vendor checklist', 'Check dietary needs', 'Plan a quiet room'],
  };
}

function ideasReply(event: EventPlan, message: string): CoachReply {
  const keywords = message.toLowerCase();
  const matches = event.ideas.filter((idea) => {
    const haystack = `${idea.title} ${idea.description} ${idea.tags.join(' ')} ${idea.category}`.toLowerCase();
    return keywords
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .some((word) => haystack.includes(word));
  });
  const suggestions = (matches.length > 0 ? matches : event.ideas).slice(0, 3);
  if (suggestions.length === 0) {
    return {
      reply: 'Your concept does not have any ideas yet. I can generate a local set now, or you can connect an AI key for a more bespoke refresh.',
      followUps: ['Regenerate my concept', 'Plan a personal touch', 'Check my budget'],
    };
  }
  const lines = ['A few ideas that fit the brief:'];
  for (const idea of suggestions) {
    lines.push('', `${idea.title} — ${idea.description}`);
  }
  lines.push('', 'You can pin the ones you love in the Concept tab; the rest can stay as options.');
  return {
    reply: lines.join('\n'),
    followUps: ['Give me a low-cost idea', 'Something for younger guests', 'Refresh my concept'],
  };
}

function sustainabilityReply(event: EventPlan): CoachReply {
  const ideas = event.ideas.filter((idea) => idea.tags.includes('sustainability')).slice(0, 3);
  const lines = [
    'The biggest wins are usually the least glamorous: borrow instead of buy, serve less meat, print less, and plan the waste route before the day.',
  ];
  if (ideas.length > 0) {
    lines.push('');
    for (const idea of ideas) lines.push(`• ${idea.title} — ${idea.description}`);
  }
  return {
    reply: lines.join('\n'),
    followUps: ['How can I reduce food waste?', 'Borrow instead of buy', 'Check my budget'],
  };
}

function greetingReply(event: EventPlan): CoachReply {
  const health = computePlanHealth(event);
  const insights = buildInsights(event);
  const top = insights[0];
  return {
    reply: [
      `I'm looking at ${event.basics.name}, ${formatDate(event.basics.date, { month: 'long', day: 'numeric' })} with ${event.basics.guestCount} guests.`,
      `Plan confidence is ${health.score}/100 (${health.label.toLowerCase()}).`,
      top ? `The thing I would look at first: ${top.title.toLowerCase()}. ${top.detail}` : 'Tell me what you want to tackle first.',
      '',
      'Ask me about the budget, guest list, vendors, timeline, accessibility, or the concept.',
    ].join('\n'),
    followUps: ['Review my budget', 'What should I book next?', 'Give me a personal touch'],
  };
}

/**
 * Deterministic, private fallback coach. It uses the same planning data as the
 * UI, so the assistant remains useful without sending anything off-device.
 */
export function localCoachReply(event: EventPlan, message: string): CoachReply {
  const text = message.toLowerCase().trim();
  if (!text || /^(hi|hello|hey|good morning|good evening)\b/.test(text)) return greetingReply(event);
  if (/(budget|cost|save|saving|cheap|afford|money|spend|over)/.test(text)) return budgetReply(event);
  if (/(guest|rsvp|headcount|invite|dietary|allerg|meal|plus.one)/.test(text)) return guestReply(event);
  if (/(vendor|supplier|book|quote|contract|email|venue)/.test(text)) return vendorReply(event);
  if (/(timeline|deadline|task|overdue|next|when|schedule|run.of.show)/.test(text)) return timelineReply(event);
  if (/(access|inclusive|disabled|wheelchair|quiet|sensory|hearing|sign language)/.test(text)) {
    return accessibilityReply(event);
  }
  if (/(sustain|waste|green|recycle|borrow|environment)/.test(text)) return sustainabilityReply(event);
  if (/(idea|theme|decor|personal|photo|food|music|fun|touch|activity|concept)/.test(text)) {
    return ideasReply(event, text);
  }
  if (/(help|what can you|how do you)/.test(text)) {
    return {
      reply:
        'I can review the budget, pressure-test the guest count, show the next milestones, find gaps in your vendor plan, suggest accessibility and dietary checks, or turn your brief into personal ideas. I answer from the plan you have built — nothing leaves this device unless you connect an AI provider.',
      followUps: ['Review my budget', 'Show my next tasks', 'Find vendor gaps'],
    };
  }
  const health = computePlanHealth(event);
  const insights = buildInsights(event);
  const top = insights[0];
  return {
    reply: [
      `I can help with that. Right now the plan is ${health.score}/100 (${health.label.toLowerCase()}).`,
      top ? `One thing worth attention: ${top.title.toLowerCase()} — ${top.detail}` : 'Tell me which part of the plan you want to work on.',
      '',
      'Try asking about budget savings, guest count, vendor gaps, next milestones, or a personal detail.',
    ].join('\n'),
    followUps: ['Review my budget', 'Find vendor gaps', 'Suggest a personal touch'],
  };
}

/** Local budget review used by the AI Studio when no key is configured. */
export function localBudgetTips(event: EventPlan): AiBudgetTip[] {
  const budget = computeBudgetSummary(event);
  return recommendSavings(event, budget)
    .slice(0, 4)
    .map((rec) => ({
      title: rec.title,
      detail: rec.detail,
      savings: rec.savings,
    }));
}

/** A compact, privacy-preserving snapshot for prompts and the Studio sidebar. */
export function eventBrief(event: EventPlan): string {
  const budget = computeBudgetSummary(event);
  const guests = computeGuestStats(event.guests);
  const vendors = computeVendorStats(event);
  const timeline = computeTimelineStats(event.tasks, event.basics.date);
  const topIdeas = event.ideas.slice(0, 4).map((idea) => idea.title);
  const nextTasks = sortTasks(event.tasks.filter((task) => !task.done))
    .slice(0, 5)
    .map((task) => `${task.title} (${task.due})`);

  return [
    `Name: ${event.basics.name}`,
    `Type: ${event.type}`,
    `Date: ${event.basics.date} (${timeline.daysUntilEvent} days away)`,
    `Location: ${event.basics.location || 'not set'}`,
    `Guests: ${event.basics.guestCount} planned; ${guests.attending} attending; ${guests.pending} pending; ${guests.attendingHeadcount} confirmed headcount`,
    `Budget: ${budget.totalBudget} ${event.basics.currency}; projected ${budget.projected}; remaining ${budget.remaining}; per guest ${budget.perGuest}`,
    `Top categories: ${budget.categories
      .slice()
      .sort((a, b) => b.planned - a.planned)
      .slice(0, 4)
      .map((category) => `${category.label} ${category.planned}`)
      .join(', ')}`,
    `Priorities: ${event.vibe.priorities.join(', ') || 'not set'}`,
    `Styles: ${event.vibe.styles.join(', ') || 'not set'}`,
    `Dietary needs: ${event.vibe.dietary.join(', ') || 'none recorded'}`,
    `Accessibility needs: ${event.vibe.accessibility.join(', ') || 'none recorded'}`,
    `Vendors: ${vendors.essentialBooked}/${vendors.essentialTotal} essential categories booked`,
    `Next tasks: ${nextTasks.join(', ') || 'none'}`,
    `Concept: ${event.concept.title} — ${event.concept.summary}`,
    `Ideas already saved: ${topIdeas.join(', ') || 'none'}`,
    `Notes: ${event.vibe.notes ? redactContactDetails(event.vibe.notes) : 'none'}`,
  ].join('\n');
}

export function totalPlanned(event: EventPlan): number {
  return sum(event.budget.items.map((item) => item.estimated));
}

export function isUpcoming(event: EventPlan, now: Date = new Date()): boolean {
  return event.basics.date >= todayIso(now);
}
