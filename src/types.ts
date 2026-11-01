/**
 * Core domain types for Gala.
 *
 * The app deliberately keeps all planning data in a small, serialisable shape so
 * that it can be validated on import and stored safely in the browser.
 */

export const EVENT_TYPES = ['wedding', 'birthday', 'community'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const PRIORITIES = [
  'food',
  'music',
  'decor',
  'photos',
  'experiences',
  'venue',
  'guests',
  'keepsakes',
  'accessibility',
  'sustainability',
] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STYLE_TAGS = [
  'modern',
  'classic',
  'bohemian',
  'minimal',
  'playful',
  'elegant',
  'cozy',
  'cultural',
  'outdoor',
  'retro',
  'luxe',
  'diy',
] as const;
export type StyleTag = (typeof STYLE_TAGS)[number];

export const DIETARY_NEEDS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'halal',
  'kosher',
  'kid-friendly',
  'alcohol-free',
] as const;
export type DietaryNeed = (typeof DIETARY_NEEDS)[number];

export const ACCESSIBILITY_NEEDS = [
  'step-free',
  'accessible-restroom',
  'quiet-room',
  'sensory-friendly',
  'hearing-support',
  'sign-language',
  'large-print',
  'accessible-parking',
  'childcare',
] as const;
export type AccessibilityNeed = (typeof ACCESSIBILITY_NEEDS)[number];

export const RSVP_STATUSES = ['pending', 'attending', 'maybe', 'declined'] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export const VENDOR_STATUSES = [
  'researching',
  'contacted',
  'quoted',
  'booked',
  'declined',
] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export const TASK_PHASES = ['foundation', 'bookings', 'details', 'final', 'event'] as const;
export type TaskPhase = (typeof TASK_PHASES)[number];

export const COST_BANDS = ['free', 'low', 'medium', 'splurge'] as const;
export type CostBand = (typeof COST_BANDS)[number];

export const EFFORT_LEVELS = ['low', 'medium', 'high'] as const;
export type Effort = (typeof EFFORT_LEVELS)[number];

export type IdeaSource = 'local' | 'ai';

export const VIEW_IDS = [
  'overview',
  'concept',
  'budget',
  'guests',
  'vendors',
  'timeline',
  'studio',
] as const;
export type ViewId = (typeof VIEW_IDS)[number];

export interface EventBasics {
  /** Human-readable event name, e.g. "Maya & Arjun's wedding". */
  name: string;
  /** Date-only ISO string (YYYY-MM-DD). */
  date: string;
  location: string;
  guestCount: number;
  /** Whole units of the selected currency. */
  budget: number;
  currency: CurrencyCode;
}

export interface EventVibe {
  priorities: Priority[];
  styles: StyleTag[];
  notes: string;
  dietary: DietaryNeed[];
  accessibility: AccessibilityNeed[];
}

export interface BudgetItem {
  id: string;
  category: string;
  label: string;
  estimated: number;
  /** Null until the user records a real quote or charge. */
  actual: number | null;
  paid: boolean;
  notes: string;
}

export interface BudgetPlan {
  items: BudgetItem[];
}

export interface Guest {
  id: string;
  name: string;
  email: string;
  group: string;
  rsvp: RsvpStatus;
  plusOnes: number;
  dietary: DietaryNeed[];
  notes: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  status: VendorStatus;
  quote: number | null;
  contactName: string;
  email: string;
  phone: string;
  followUp: string;
  notes: string;
  checklist: ChecklistItem[];
}

export interface PlanTask {
  id: string;
  title: string;
  phase: TaskPhase;
  /** Date-only ISO string (YYYY-MM-DD). */
  due: string;
  done: boolean;
  priority: 'high' | 'medium' | 'low';
  notes: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  costBand: CostBand;
  effort: Effort;
  tags: string[];
  whyItFits: string;
  source: IdeaSource;
  pinned: boolean;
}

export interface Concept {
  title: string;
  summary: string;
  /** Hex colours used for the visual palette. */
  palette: string[];
  signatureMoments: string[];
  source: IdeaSource;
}

export interface AiBudgetTip {
  title: string;
  detail: string;
  /** Estimated saving in whole units, or null when it cannot be quantified. */
  savings: number | null;
}

export interface AiNotes {
  summary: string;
  budgetTips: AiBudgetTip[];
  timelineTips: string[];
  vendorTips: string[];
  generatedAt: string;
}

export interface EventPlan {
  id: string;
  type: EventType;
  basics: EventBasics;
  vibe: EventVibe;
  budget: BudgetPlan;
  guests: Guest[];
  vendors: Vendor[];
  tasks: PlanTask[];
  concept: Concept;
  ideas: Idea[];
  aiNotes: AiNotes | null;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  schemaVersion: 1;
  activeEventId: string | null;
  events: EventPlan[];
}

export interface EventDraft {
  type: EventType;
  name: string;
  date: string;
  location: string;
  guestCount: number;
  budget: number;
  currency: CurrencyCode;
  priorities: Priority[];
  styles: StyleTag[];
  dietary: DietaryNeed[];
  accessibility: AccessibilityNeed[];
  notes: string;
}

export interface CategorySummary {
  id: string;
  label: string;
  color: string;
  target: number;
  planned: number;
  projected: number;
  difference: number;
  variableShare: number;
}

export interface BudgetSummary {
  totalBudget: number;
  planned: number;
  actual: number;
  projected: number;
  remaining: number;
  overBy: number;
  perGuest: number;
  effectiveGuests: number;
  categories: CategorySummary[];
}

export interface GuestStats {
  invited: number;
  attending: number;
  maybe: number;
  declined: number;
  pending: number;
  attendingHeadcount: number;
  knownRatio: number;
  dietary: Array<{ need: DietaryNeed; count: number }>;
  hasPlusOnes: boolean;
}

export interface VendorCategoryReadiness {
  id: string;
  label: string;
  essential: boolean;
  booked: boolean;
  vendorCount: number;
}

export interface VendorStats {
  categories: VendorCategoryReadiness[];
  essentialTotal: number;
  essentialBooked: number;
  booked: number;
  quoted: number;
  contacted: number;
  researching: number;
  declined: number;
  quotedValue: number;
}

export interface TimelineStats {
  total: number;
  done: number;
  overdue: number;
  completion: number;
  next: PlanTask[];
  daysUntilEvent: number;
  eventIsPast: boolean;
}

export interface Insight {
  id: string;
  severity: 'critical' | 'warning' | 'good' | 'info';
  title: string;
  detail: string;
  action?: {
    label: string;
    view: ViewId;
  };
}

export interface PlanHealth {
  score: number;
  label: 'On track' | 'Steady' | 'Needs attention' | 'At risk';
  factors: Array<{
    id: 'budget' | 'timeline' | 'vendors' | 'guests';
    label: string;
    score: number;
  }>;
}

export interface ConceptResult {
  concept: Concept;
  ideas: Idea[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source: 'local' | 'ai' | 'error';
  createdAt: string;
}


export type AiProvider = 'gemini' | 'openai' | 'local';

export interface AiSettings {
  provider: AiProvider;
  model: string;
  rememberKey: boolean;
}
