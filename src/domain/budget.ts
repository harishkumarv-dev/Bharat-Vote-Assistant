import {
  BUDGET_CATEGORIES,
  SAVINGS_PLAYBOOK,
  budgetCategory,
} from './catalog';
import { formatMoney, sum } from './money';
import { effectiveGuestCount } from './guests';
import type {
  BudgetItem,
  BudgetSummary,
  CategorySummary,
  EventPlan,
  EventType,
} from '../types';
import { createId } from '../utils';

/** Create one starting line item per category, with the budget split by template. */
export function allocateBudget(totalBudget: number, type: EventType): BudgetItem[] {
  const total = Math.max(0, Math.round(totalBudget));
  const categories = BUDGET_CATEGORIES[type];
  const amounts = categories.map((category) => Math.round((total * category.share) / 100));

  if (amounts.length > 0) {
    const current = sum(amounts);
    const largestIndex = amounts.indexOf(Math.max(...amounts));
    amounts[largestIndex] = Math.max(0, amounts[largestIndex] + (total - current));
  }

  return categories.map((category, index) => ({
    id: createId('budget'),
    category: category.id,
    label: category.itemLabel,
    estimated: amounts[index] ?? 0,
    actual: null,
    paid: false,
    notes: '',
  }));
}

export function projectedItemCost(item: BudgetItem): number {
  return Math.max(item.estimated, item.actual ?? 0);
}

export function computeBudgetSummary(event: EventPlan): BudgetSummary {
  const items = event.budget.items;
  const totalBudget = Math.max(0, event.basics.budget);
  const planned = sum(items.map((item) => item.estimated));
  const actual = sum(items.map((item) => item.actual ?? 0));
  const projected = sum(items.map(projectedItemCost));
  const effectiveGuests = effectiveGuestCount(event.guests, event.basics.guestCount);

  const categories: CategorySummary[] = BUDGET_CATEGORIES[event.type].map((category) => {
    const categoryItems = items.filter((item) => item.category === category.id);
    const categoryPlanned = sum(categoryItems.map((item) => item.estimated));
    const categoryProjected = sum(categoryItems.map(projectedItemCost));
    const target = Math.round((totalBudget * category.share) / 100);
    return {
      id: category.id,
      label: category.label,
      color: category.color,
      target,
      planned: categoryPlanned,
      projected: categoryProjected,
      difference: target - categoryProjected,
      variableShare: category.variableShare,
    };
  });

  return {
    totalBudget,
    planned,
    actual,
    projected,
    remaining: totalBudget - projected,
    overBy: Math.max(0, projected - totalBudget),
    perGuest: Math.round(projected / Math.max(1, effectiveGuests)),
    effectiveGuests,
    categories,
  };
}

/** Spend that changes when the guest count changes (food, favours, stationery…). */
export function variableSpend(summary: BudgetSummary): number {
  return Math.round(
    sum(summary.categories.map((category) => category.planned * category.variableShare)),
  );
}

/**
 * Scale every line item proportionally so the plan matches the total budget.
 * Actual quotes are left untouched — they are facts, not estimates.
 */
export function rebalanceBudgetItems(
  items: BudgetItem[],
  totalBudget: number,
  type: EventType,
): BudgetItem[] {
  const total = Math.max(0, Math.round(totalBudget));
  if (items.length === 0) return allocateBudget(total, type);

  const planned = sum(items.map((item) => item.estimated));
  if (planned <= 0) return allocateBudget(total, type);

  const scale = total / planned;
  const scaled = items.map((item) => ({
    ...item,
    estimated: Math.max(0, Math.round(item.estimated * scale)),
  }));

  const difference = total - sum(scaled.map((item) => item.estimated));
  if (difference !== 0 && scaled.length > 0) {
    let largestIndex = 0;
    for (let index = 1; index < scaled.length; index += 1) {
      if (scaled[index].estimated > scaled[largestIndex].estimated) largestIndex = index;
    }
    scaled[largestIndex] = {
      ...scaled[largestIndex],
      estimated: Math.max(0, scaled[largestIndex].estimated + difference),
    };
  }

  return scaled;
}

export type RecommendationKind = 'gap' | 'guest' | 'playbook';

export interface SavingsRecommendation {
  id: string;
  kind: RecommendationKind;
  title: string;
  detail: string;
  savings: number;
  categoryIds: string[];
}

function categoryPlanned(summary: BudgetSummary, categoryId: string): number {
  return summary.categories.find((category) => category.id === categoryId)?.planned ?? 0;
}

export function recommendSavings(event: EventPlan, summary: BudgetSummary): SavingsRecommendation[] {
  const recommendations: SavingsRecommendation[] = [];
  const currency = event.basics.currency;

  if (summary.overBy > 0) {
    const worstCategory = [...summary.categories].sort((a, b) => a.difference - b.difference)[0];
    recommendations.push({
      id: 'close-gap',
      kind: 'gap',
      title: `Close the ${formatMoney(summary.overBy, currency)} gap`,
      detail: worstCategory
        ? `${worstCategory.label} is the furthest above its envelope. Trim it first, then rebalance the rest of the plan.`
        : 'Review your largest line items first, then rebalance the rest of the plan.',
      savings: summary.overBy,
      categoryIds: worstCategory ? [worstCategory.id] : [],
    });
  }

  const guestSavings = Math.round(variableSpend(summary) * 0.1);
  if (summary.effectiveGuests > 12 && guestSavings > 0) {
    const fewerGuests = Math.max(1, Math.round(summary.effectiveGuests * 0.1));
    recommendations.push({
      id: 'guest-trim',
      kind: 'guest',
      title: `Invite about ${fewerGuests} fewer guests`,
      detail: `Food, favours, stationery, and other per-head costs would drop by roughly ${formatMoney(guestSavings, currency)}. Only do this if the guest list is still generous.`,
      savings: guestSavings,
      categoryIds: [],
    });
  }

  const usedCategories = new Set<string>();
  const playbookOptions = SAVINGS_PLAYBOOK.filter(
    (entry) => !entry.eventTypes || entry.eventTypes.includes(event.type),
  )
    .map((entry) => {
      const planned = sum(entry.categories.map((category) => categoryPlanned(summary, category)));
      const savings = Math.round(planned * entry.rate);
      return { entry, planned, savings };
    })
    .filter((option) => option.planned > 0 && option.savings > 0)
    .sort((a, b) => b.savings - a.savings);

  for (const option of playbookOptions) {
    if (option.entry.categories.some((category) => usedCategories.has(category))) continue;
    recommendations.push({
      id: option.entry.id,
      kind: 'playbook',
      title: option.entry.title,
      detail: `${option.entry.detail} Estimated saving: ${formatMoney(option.savings, currency)}.`,
      savings: option.savings,
      categoryIds: option.entry.categories,
    });
    for (const category of option.entry.categories) usedCategories.add(category);
    if (recommendations.length >= 6) break;
  }

  return recommendations
    .sort((a, b) => {
      if (a.kind === 'gap' && b.kind !== 'gap') return -1;
      if (b.kind === 'gap' && a.kind !== 'gap') return 1;
      return b.savings - a.savings;
    })
    .slice(0, 5);
}

export function categoriesAboveEnvelope(summary: BudgetSummary, threshold = 0.1): CategorySummary[] {
  return summary.categories.filter(
    (category) =>
      category.target > 0 && category.projected > category.target * (1 + threshold),
  );
}

export function categoryLabel(type: EventType, categoryId: string): string {
  return budgetCategory(type, categoryId)?.label ?? 'Other';
}

export function categoryColor(type: EventType, categoryId: string): string {
  return budgetCategory(type, categoryId)?.color ?? '#7C7463';
}
