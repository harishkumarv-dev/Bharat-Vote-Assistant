import type {
  AiBudgetTip,
  AiNotes,
  BudgetItem,
  EventBasics,
  EventDraft,
  EventPlan,
  EventVibe,
  Guest,
  PlanTask,
  Vendor,
  Workspace,
} from '../types';
import {
  ACCESSIBILITY_NEEDS,
  DIETARY_NEEDS,
  PRIORITIES,
  RSVP_STATUSES,
  STYLE_TAGS,
  TASK_PHASES,
  VENDOR_STATUSES,
} from '../types';
import { buildLocalConcept } from '../domain/plan';
import { createEvent } from '../domain/factory';
import { rebalanceBudgetItems } from '../domain/budget';
import { createGuest, type GuestInput } from '../domain/guests';
import { createVendor, type VendorInput } from '../domain/vendors';
import { createTask, shiftIncompleteTasks } from '../domain/timeline';
import { daysBetweenIso, isValidIsoDate } from '../domain/dates';
import type { ConceptResult } from '../types';
import { cleanText, createId } from '../utils';

export interface AiPlanResult extends ConceptResult {
  budgetTips: AiBudgetTip[];
  timelineTips: string[];
  vendorTips: string[];
}

export type PlannerAction =
  | { type: 'CREATE_EVENT'; draft: EventDraft }
  | { type: 'SELECT_EVENT'; eventId: string }
  | { type: 'DELETE_EVENT'; eventId: string }
  | { type: 'REPLACE_WORKSPACE'; workspace: Workspace }
  | { type: 'UPDATE_BASICS'; patch: Partial<EventBasics> }
  | { type: 'UPDATE_VIBE'; patch: Partial<EventVibe> }
  | { type: 'ADD_BUDGET_ITEM'; category: string; label: string; estimated: number; notes?: string }
  | { type: 'UPDATE_BUDGET_ITEM'; id: string; patch: Partial<BudgetItem> }
  | { type: 'DELETE_BUDGET_ITEM'; id: string }
  | { type: 'REBALANCE_BUDGET' }
  | { type: 'ADD_GUEST'; guest: GuestInput }
  | { type: 'UPDATE_GUEST'; id: string; patch: Partial<Guest> }
  | { type: 'DELETE_GUEST'; id: string }
  | { type: 'IMPORT_GUESTS'; guests: Guest[] }
  | { type: 'ADD_VENDOR'; vendor: VendorInput }
  | { type: 'UPDATE_VENDOR'; id: string; patch: Partial<Vendor> }
  | { type: 'DELETE_VENDOR'; id: string }
  | { type: 'TOGGLE_VENDOR_CHECK'; vendorId: string; checkId: string }
  | { type: 'ADD_TASK'; task: { title: string; phase: PlanTask['phase']; due: string; priority?: PlanTask['priority']; notes?: string } }
  | { type: 'UPDATE_TASK'; id: string; patch: Partial<PlanTask> }
  | { type: 'TOGGLE_TASK'; id: string }
  | { type: 'DELETE_TASK'; id: string }
  | { type: 'REGENERATE_LOCAL_CONCEPT' }
  | { type: 'APPLY_AI_PLAN'; result: AiPlanResult; generatedAt: string }
  | { type: 'SET_AI_BUDGET_TIPS'; summary: string; tips: AiBudgetTip[]; generatedAt: string }
  | { type: 'TOGGLE_IDEA_PIN'; id: string };

function touch(event: EventPlan): EventPlan {
  return { ...event, updatedAt: new Date().toISOString() };
}

function withActiveEvent(
  state: Workspace,
  updater: (event: EventPlan) => EventPlan,
): Workspace {
  if (!state.activeEventId) return state;
  const index = state.events.findIndex((event) => event.id === state.activeEventId);
  if (index === -1) return state;
  const updated = touch(updater(state.events[index]));
  const events = state.events.slice();
  events[index] = updated;
  return { ...state, events };
}

function mergePinnedIdeas(existing: EventPlan['ideas'], next: EventPlan['ideas']): EventPlan['ideas'] {
  const pinned = existing.filter((idea) => idea.pinned);
  const seen = new Set(pinned.map((idea) => idea.title.toLowerCase()));
  const uniqueNext = next.filter((idea) => {
    const key = idea.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...pinned, ...uniqueNext].slice(0, 16);
}

function normaliseGuest(guest: Guest, patch: Partial<Guest>): Guest {
  const next = { ...guest, ...patch };
  return {
    ...next,
    name: cleanText(next.name, 80),
    email: cleanText(next.email, 120),
    group: cleanText(next.group, 40),
    rsvp: RSVP_STATUSES.includes(next.rsvp) ? next.rsvp : guest.rsvp,
    plusOnes: Math.min(10, Math.max(0, Math.round(next.plusOnes) || 0)),
    dietary: Array.from(new Set(next.dietary.filter((need) => DIETARY_NEEDS.includes(need)))),
    notes: cleanText(next.notes, 300),
  };
}

export function plannerReducer(state: Workspace, action: PlannerAction): Workspace {
  switch (action.type) {
    case 'CREATE_EVENT': {
      if (state.events.length >= 12) return state;
      const event = createEvent(action.draft);
      return {
        ...state,
        activeEventId: event.id,
        events: [...state.events, event],
      };
    }

    case 'SELECT_EVENT':
      return state.events.some((event) => event.id === action.eventId)
        ? { ...state, activeEventId: action.eventId }
        : state;

    case 'DELETE_EVENT': {
      const events = state.events.filter((event) => event.id !== action.eventId);
      const activeEventId =
        state.activeEventId === action.eventId ? (events[0]?.id ?? null) : state.activeEventId;
      return { ...state, events, activeEventId };
    }

    case 'REPLACE_WORKSPACE':
      return action.workspace;

    case 'UPDATE_BASICS':
      return withActiveEvent(state, (event) => {
        const patch = action.patch;
        const basics: EventBasics = {
          ...event.basics,
          ...patch,
          name:
            patch.name !== undefined ? cleanText(patch.name, 80) || event.basics.name : event.basics.name,
          location: patch.location !== undefined ? cleanText(patch.location, 100) : event.basics.location,
          guestCount:
            patch.guestCount !== undefined
              ? Math.min(2000, Math.max(1, Math.round(patch.guestCount) || 1))
              : event.basics.guestCount,
          budget:
            patch.budget !== undefined
              ? Math.min(100_000_000, Math.max(0, Math.round(patch.budget) || 0))
              : event.basics.budget,
          date:
            patch.date !== undefined && isValidIsoDate(patch.date) ? patch.date : event.basics.date,
        };
        let tasks = event.tasks;
        if (basics.date !== event.basics.date) {
          tasks = shiftIncompleteTasks(tasks, daysBetweenIso(event.basics.date, basics.date));
        }
        return { ...event, basics, tasks };
      });

    case 'UPDATE_VIBE':
      return withActiveEvent(state, (event) => ({
        ...event,
        vibe: {
          ...event.vibe,
          ...action.patch,
          priorities: action.patch.priorities
            ? Array.from(new Set(action.patch.priorities.filter((value) => PRIORITIES.includes(value))))
            : event.vibe.priorities,
          styles: action.patch.styles
            ? Array.from(new Set(action.patch.styles.filter((value) => STYLE_TAGS.includes(value))))
            : event.vibe.styles,
          dietary: action.patch.dietary
            ? Array.from(new Set(action.patch.dietary.filter((value) => DIETARY_NEEDS.includes(value))))
            : event.vibe.dietary,
          accessibility: action.patch.accessibility
            ? Array.from(
                new Set(
                  action.patch.accessibility.filter((value) => ACCESSIBILITY_NEEDS.includes(value)),
                ),
              )
            : event.vibe.accessibility,
          notes: action.patch.notes !== undefined ? cleanText(action.patch.notes, 600) : event.vibe.notes,
        },
      }));

    case 'ADD_BUDGET_ITEM':
      return withActiveEvent(state, (event) => {
        const item: BudgetItem = {
          id: createId('budget'),
          category: action.category,
          label: cleanText(action.label, 120) || 'New line item',
          estimated: Math.max(0, Math.round(action.estimated) || 0),
          actual: null,
          paid: false,
          notes: cleanText(action.notes ?? '', 400),
        };
        return { ...event, budget: { items: [...event.budget.items, item] } };
      });

    case 'UPDATE_BUDGET_ITEM':
      return withActiveEvent(state, (event) => ({
        ...event,
        budget: {
          items: event.budget.items.map((item) => {
            if (item.id !== action.id) return item;
            const patch = action.patch;
            return {
              ...item,
              ...patch,
              label: patch.label !== undefined ? cleanText(patch.label, 120) || item.label : item.label,
              estimated:
                patch.estimated !== undefined
                  ? Math.min(100_000_000, Math.max(0, Math.round(patch.estimated) || 0))
                  : item.estimated,
              actual:
                patch.actual === null
                  ? null
                  : patch.actual !== undefined
                    ? Math.min(100_000_000, Math.max(0, Math.round(patch.actual) || 0))
                    : item.actual,
              notes: patch.notes !== undefined ? cleanText(patch.notes, 400) : item.notes,
            };
          }),
        },
      }));

    case 'DELETE_BUDGET_ITEM':
      return withActiveEvent(state, (event) => ({
        ...event,
        budget: { items: event.budget.items.filter((item) => item.id !== action.id) },
      }));

    case 'REBALANCE_BUDGET':
      return withActiveEvent(state, (event) => ({
        ...event,
        budget: {
          items: rebalanceBudgetItems(event.budget.items, event.basics.budget, event.type),
        },
      }));

    case 'ADD_GUEST':
      return withActiveEvent(state, (event) => ({
        ...event,
        guests: [...event.guests, createGuest(action.guest)],
      }));

    case 'UPDATE_GUEST':
      return withActiveEvent(state, (event) => ({
        ...event,
        guests: event.guests.map((guest) =>
          guest.id === action.id ? normaliseGuest(guest, action.patch) : guest,
        ),
      }));

    case 'DELETE_GUEST':
      return withActiveEvent(state, (event) => ({
        ...event,
        guests: event.guests.filter((guest) => guest.id !== action.id),
      }));

    case 'IMPORT_GUESTS':
      return withActiveEvent(state, (event) => ({
        ...event,
        guests: [...event.guests, ...action.guests].slice(0, 1000),
      }));

    case 'ADD_VENDOR':
      return withActiveEvent(state, (event) => ({
        ...event,
        vendors: [...event.vendors, createVendor(event.type, action.vendor)],
      }));

    case 'UPDATE_VENDOR':
      return withActiveEvent(state, (event) => ({
        ...event,
        vendors: event.vendors.map((vendor) => {
          if (vendor.id !== action.id) return vendor;
          const patch = action.patch;
          return {
            ...vendor,
            ...patch,
            name: patch.name !== undefined ? cleanText(patch.name, 100) || vendor.name : vendor.name,
            status:
              patch.status !== undefined && VENDOR_STATUSES.includes(patch.status)
                ? patch.status
                : vendor.status,
            quote:
              patch.quote === null
                ? null
                : patch.quote !== undefined
                  ? Math.min(100_000_000, Math.max(0, Math.round(patch.quote) || 0))
                  : vendor.quote,
            contactName:
              patch.contactName !== undefined
                ? cleanText(patch.contactName, 80)
                : vendor.contactName,
            email: patch.email !== undefined ? cleanText(patch.email, 120) : vendor.email,
            phone: patch.phone !== undefined ? cleanText(patch.phone, 40) : vendor.phone,
            followUp:
              patch.followUp !== undefined && (patch.followUp === '' || isValidIsoDate(patch.followUp))
                ? patch.followUp
                : vendor.followUp,
            notes: patch.notes !== undefined ? cleanText(patch.notes, 500) : vendor.notes,
          };
        }),
      }));

    case 'DELETE_VENDOR':
      return withActiveEvent(state, (event) => ({
        ...event,
        vendors: event.vendors.filter((vendor) => vendor.id !== action.id),
      }));

    case 'TOGGLE_VENDOR_CHECK':
      return withActiveEvent(state, (event) => ({
        ...event,
        vendors: event.vendors.map((vendor) =>
          vendor.id === action.vendorId
            ? {
                ...vendor,
                checklist: vendor.checklist.map((item) =>
                  item.id === action.checkId ? { ...item, done: !item.done } : item,
                ),
              }
            : vendor,
        ),
      }));

    case 'ADD_TASK':
      return withActiveEvent(state, (event) => ({
        ...event,
        tasks: [...event.tasks, createTask(action.task)],
      }));

    case 'UPDATE_TASK':
      return withActiveEvent(state, (event) => ({
        ...event,
        tasks: event.tasks.map((task) => {
          if (task.id !== action.id) return task;
          const patch = action.patch;
          return {
            ...task,
            ...patch,
            title: patch.title !== undefined ? cleanText(patch.title, 120) || task.title : task.title,
            phase:
              patch.phase !== undefined && TASK_PHASES.includes(patch.phase) ? patch.phase : task.phase,
            due: patch.due !== undefined && isValidIsoDate(patch.due) ? patch.due : task.due,
            priority:
              patch.priority === 'high' || patch.priority === 'medium' || patch.priority === 'low'
                ? patch.priority
                : task.priority,
            notes: patch.notes !== undefined ? cleanText(patch.notes, 400) : task.notes,
          };
        }),
      }));

    case 'TOGGLE_TASK':
      return withActiveEvent(state, (event) => ({
        ...event,
        tasks: event.tasks.map((task) =>
          task.id === action.id ? { ...task, done: !task.done } : task,
        ),
      }));

    case 'DELETE_TASK':
      return withActiveEvent(state, (event) => ({
        ...event,
        tasks: event.tasks.filter((task) => task.id !== action.id),
      }));

    case 'REGENERATE_LOCAL_CONCEPT':
      return withActiveEvent(state, (event) => {
        const local = buildLocalConcept(event);
        return {
          ...event,
          concept: local.concept,
          ideas: mergePinnedIdeas(event.ideas, local.ideas),
          aiNotes: null,
        };
      });

    case 'APPLY_AI_PLAN':
      return withActiveEvent(state, (event) => {
        const notes: AiNotes = {
          summary: action.result.concept.summary,
          budgetTips: action.result.budgetTips,
          timelineTips: action.result.timelineTips,
          vendorTips: action.result.vendorTips,
          generatedAt: action.generatedAt,
        };
        return {
          ...event,
          concept: action.result.concept,
          ideas: mergePinnedIdeas(event.ideas, action.result.ideas),
          aiNotes: notes,
        };
      });

    case 'SET_AI_BUDGET_TIPS':
      return withActiveEvent(state, (event) => {
        const notes: AiNotes = event.aiNotes
          ? { ...event.aiNotes, budgetTips: action.tips, generatedAt: action.generatedAt }
          : {
              summary: action.summary,
              budgetTips: action.tips,
              timelineTips: [],
              vendorTips: [],
              generatedAt: action.generatedAt,
            };
        return { ...event, aiNotes: notes };
      });

    case 'TOGGLE_IDEA_PIN':
      return withActiveEvent(state, (event) => ({
        ...event,
        ideas: event.ideas.map((idea) =>
          idea.id === action.id ? { ...idea, pinned: !idea.pinned } : idea,
        ),
      }));

    default:
      return state;
  }
}
