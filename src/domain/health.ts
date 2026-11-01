import { computeBudgetSummary } from './budget';
import { DIETARY_LABELS, ACCESSIBILITY_LABELS } from './catalog';
import { formatMoney } from './money';
import { computeGuestStats } from './guests';
import { computeTimelineStats } from './timeline';
import { computeVendorStats, missingEssentialVendors } from './vendors';
import type { EventPlan, Insight, PlanHealth } from '../types';
import { clamp } from '../utils';

function healthLabel(score: number): PlanHealth['label'] {
  if (score >= 85) return 'On track';
  if (score >= 70) return 'Steady';
  if (score >= 50) return 'Needs attention';
  return 'At risk';
}

export function computePlanHealth(event: EventPlan, now: Date = new Date()): PlanHealth {
  const budget = computeBudgetSummary(event);
  const timeline = computeTimelineStats(event.tasks, event.basics.date, now);
  const vendors = computeVendorStats(event);
  const guests = computeGuestStats(event.guests);

  let budgetScore = 50;
  if (budget.totalBudget > 0) {
    budgetScore =
      budget.projected <= budget.totalBudget
        ? 100
        : clamp(100 - ((budget.projected - budget.totalBudget) / budget.totalBudget) * 120, 15, 99);
  }

  let timelineScore = 40;
  if (timeline.total > 0) {
    timelineScore = clamp(100 - timeline.overdue * 15, 10, 100);
    if (timeline.eventIsPast) {
      timelineScore = Math.round(timeline.completion * 100);
    } else if (timeline.daysUntilEvent < 30 && timeline.completion < 0.5) {
      timelineScore = clamp(timelineScore - 20, 10, 100);
    }
  }

  const vendorScore =
    vendors.essentialTotal === 0
      ? 50
      : Math.round(35 + 65 * (vendors.essentialBooked / vendors.essentialTotal));

  let guestScore = 40;
  if (guests.invited > 0) {
    guestScore = clamp(Math.round(40 + 60 * guests.knownRatio), 40, 100);
    if (timeline.daysUntilEvent >= 0 && timeline.daysUntilEvent < 30 && guests.attending === 0) {
      guestScore = clamp(guestScore - 20, 20, 100);
    }
  }

  const factors: PlanHealth['factors'] = [
    { id: 'budget', label: 'Budget', score: Math.round(budgetScore) },
    { id: 'timeline', label: 'Timeline', score: Math.round(timelineScore) },
    { id: 'vendors', label: 'Vendors', score: Math.round(vendorScore) },
    { id: 'guests', label: 'Guests', score: Math.round(guestScore) },
  ];

  const score = Math.round(
    budgetScore * 0.35 + timelineScore * 0.25 + vendorScore * 0.2 + guestScore * 0.2,
  );

  return { score, label: healthLabel(score), factors };
}

export function buildInsights(event: EventPlan, now: Date = new Date()): Insight[] {
  const budget = computeBudgetSummary(event);
  const timeline = computeTimelineStats(event.tasks, event.basics.date, now);
  const vendors = computeVendorStats(event);
  const guests = computeGuestStats(event.guests);
  const insights: Insight[] = [];
  const currency = event.basics.currency;

  if (budget.overBy > 0) {
    const worstCategory = [...budget.categories].sort((a, b) => a.difference - b.difference)[0];
    insights.push({
      id: 'budget-over',
      severity: 'critical',
      title: `Plan is ${formatMoney(budget.overBy, currency)} over budget`,
      detail: worstCategory
        ? `${worstCategory.label} is the biggest overrun. Trim it or move money from a category with headroom.`
        : 'Review your largest line items and decide what can move.',
      action: { label: 'Review budget', view: 'budget' },
    });
  } else if (budget.totalBudget > 0 && budget.remaining > budget.totalBudget * 0.1) {
    insights.push({
      id: 'budget-unallocated',
      severity: 'info',
      title: `${formatMoney(budget.remaining, currency)} is still unallocated`,
      detail:
        'You have room to protect the parts that matter most — or keep a calm buffer for surprises.',
      action: { label: 'See the plan', view: 'budget' },
    });
  }

  if (timeline.overdue > 0) {
    insights.push({
      id: 'timeline-overdue',
      severity: 'critical',
      title: `${timeline.overdue} milestone${timeline.overdue === 1 ? '' : 's'} overdue`,
      detail: 'Start with the highest-priority task, or adjust the date if the timeline is no longer realistic.',
      action: { label: 'Open timeline', view: 'timeline' },
    });
  } else if (timeline.total > 0 && timeline.daysUntilEvent >= 0 && timeline.daysUntilEvent < 14) {
    const highPriorityOpen = event.tasks.filter(
      (task) => !task.done && task.priority === 'high',
    ).length;
    if (highPriorityOpen > 0) {
      insights.push({
        id: 'timeline-final',
        severity: 'warning',
        title: `${highPriorityOpen} high-priority task${highPriorityOpen === 1 ? '' : 's'} left`,
        detail: `There are ${timeline.daysUntilEvent} day${timeline.daysUntilEvent === 1 ? '' : 's'} until the event. Keep the final week light and specific.`,
        action: { label: 'See final tasks', view: 'timeline' },
      });
    }
  }

  const missingVendors = missingEssentialVendors(vendors);
  if (missingVendors.length > 0) {
    insights.push({
      id: 'vendors-missing',
      severity: missingVendors.length >= 3 ? 'warning' : 'info',
      title: `${missingVendors.length} essential vendor${missingVendors.length === 1 ? '' : 's'} not booked`,
      detail: `Still open: ${missingVendors.map((vendor) => vendor.label).join(', ')}. Use the vendor questions before you commit.`,
      action: { label: 'Open vendor plan', view: 'vendors' },
    });
  } else if (vendors.essentialTotal > 0) {
    insights.push({
      id: 'vendors-ready',
      severity: 'good',
      title: 'Essential vendor team is booked',
      detail: 'Keep final confirmations and backup contacts in one place for the week of the event.',
      action: { label: 'View vendors', view: 'vendors' },
    });
  }

  if (guests.invited > 0 && timeline.daysUntilEvent >= 0 && timeline.daysUntilEvent <= 45) {
    const unknown = guests.pending + guests.maybe;
    if (unknown > 0) {
      insights.push({
        id: 'guests-pending',
        severity: unknown > guests.invited * 0.4 ? 'warning' : 'info',
        title: `${unknown} guest${unknown === 1 ? '' : 's'} still need a firm reply`,
        detail: 'Catering and seating usually need a reliable headcount before the final week.',
        action: { label: 'Chase RSVPs', view: 'guests' },
      });
    }
  } else if (guests.invited === 0) {
    insights.push({
      id: 'guests-empty',
      severity: 'info',
      title: 'Your guest list is still a blank page',
      detail: 'Start with the people you could not imagine the day without, then test the budget.',
      action: { label: 'Add guests', view: 'guests' },
    });
  }

  if (guests.dietary.length > 0) {
    const summary = guests.dietary
      .slice(0, 3)
      .map((entry) => `${DIETARY_LABELS[entry.need]} ×${entry.count}`)
      .join(', ');
    insights.push({
      id: 'guests-dietary',
      severity: 'good',
      title: 'Dietary needs are on the radar',
      detail: `${summary}. Ask the caterer how they prevent cross-contamination, not just whether they can accommodate.`,
      action: { label: 'Review guests', view: 'guests' },
    });
  }

  if (event.vibe.accessibility.length > 0) {
    const list = event.vibe.accessibility
      .slice(0, 3)
      .map((need) => ACCESSIBILITY_LABELS[need])
      .join(', ');
    insights.push({
      id: 'accessibility-plan',
      severity: 'good',
      title: 'Accessibility is part of the brief',
      detail: `${list}. Turn each need into a specific question for the venue and a line in the run-of-show.`,
      action: { label: 'Check vendors', view: 'vendors' },
    });
  }

  if (budget.overBy > 0 && budget.remaining < 0) {
    const guides = budget.categories.filter(
      (category) => category.target > 0 && category.projected > category.target * 1.15,
    );
    if (guides.length > 0) {
      const first = guides[0];
      insights.push({
        id: 'category-over',
        severity: 'warning',
        title: `${first.label} is above its envelope`,
        detail: `${formatMoney(first.projected - first.target, currency)} over the template share. You can keep it if another category gives way.`,
        action: { label: 'Compare categories', view: 'budget' },
      });
    }
  }

  const rank = { critical: 0, warning: 1, info: 2, good: 3 };
  return insights.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 7);
}
