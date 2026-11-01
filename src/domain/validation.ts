import { z } from 'zod';
import {
  ACCESSIBILITY_NEEDS,
  COST_BANDS,
  CURRENCIES,
  DIETARY_NEEDS,
  EFFORT_LEVELS,
  EVENT_TYPES,
  PRIORITIES,
  RSVP_STATUSES,
  STYLE_TAGS,
  TASK_PHASES,
  VENDOR_STATUSES,
} from '../types';
import type { Workspace } from '../types';
import { BUDGET_CATEGORIES, VENDOR_CATEGORIES } from './catalog';
import { isValidIsoDate } from './dates';

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.')
  .refine(isValidIsoDate, 'That date does not exist.');

const money = z.number().int().min(0).max(100_000_000);
const shortText = (max: number) => z.string().max(max);
const hexColour = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex colour.');

export const budgetItemSchema = z.object({
  id: z.string().min(1).max(120),
  category: z.string().min(1).max(40),
  label: shortText(120),
  estimated: money,
  actual: money.nullable(),
  paid: z.boolean(),
  notes: shortText(400),
});

export const guestSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(80),
  email: shortText(120),
  group: shortText(40),
  rsvp: z.enum(RSVP_STATUSES),
  plusOnes: z.number().int().min(0).max(10),
  dietary: z.array(z.enum(DIETARY_NEEDS)).max(DIETARY_NEEDS.length),
  notes: shortText(300),
});

export const checklistItemSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().min(1).max(300),
  done: z.boolean(),
});

export const vendorSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(40),
  status: z.enum(VENDOR_STATUSES),
  quote: money.nullable(),
  contactName: shortText(80),
  email: shortText(120),
  phone: shortText(40),
  followUp: z.union([z.literal(''), dateOnly]),
  notes: shortText(500),
  checklist: z.array(checklistItemSchema).max(20),
});

export const taskSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(120),
  phase: z.enum(TASK_PHASES),
  due: dateOnly,
  done: z.boolean(),
  priority: z.enum(['high', 'medium', 'low']),
  notes: shortText(400),
});

export const ideaSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  category: shortText(60),
  costBand: z.enum(COST_BANDS),
  effort: z.enum(EFFORT_LEVELS),
  tags: z.array(z.string().max(40)).max(12),
  whyItFits: shortText(300),
  source: z.enum(['local', 'ai']),
  pinned: z.boolean(),
});

export const conceptSchema = z.object({
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(800),
  palette: z.array(hexColour).min(3).max(6),
  signatureMoments: z.array(z.string().min(1).max(240)).min(1).max(6),
  source: z.enum(['local', 'ai']),
});

export const aiNoteSchema = z.object({
  summary: shortText(600),
  budgetTips: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        detail: z.string().min(1).max(500),
        savings: money.nullable(),
      }),
    )
    .max(6),
  timelineTips: z.array(z.string().max(300)).max(6),
  vendorTips: z.array(z.string().max(300)).max(6),
  generatedAt: z.string().max(40),
});

export const eventSchema = z
  .object({
    id: z.string().min(1).max(120),
    type: z.enum(EVENT_TYPES),
    basics: z.object({
      name: z.string().min(1).max(80),
      date: dateOnly,
      location: shortText(100),
      guestCount: z.number().int().min(1).max(2000),
      budget: money,
      currency: z.enum(CURRENCIES),
    }),
    vibe: z.object({
      priorities: z.array(z.enum(PRIORITIES)).max(PRIORITIES.length),
      styles: z.array(z.enum(STYLE_TAGS)).max(STYLE_TAGS.length),
      notes: shortText(600),
      dietary: z.array(z.enum(DIETARY_NEEDS)).max(DIETARY_NEEDS.length),
      accessibility: z.array(z.enum(ACCESSIBILITY_NEEDS)).max(ACCESSIBILITY_NEEDS.length),
    }),
    budget: z.object({ items: z.array(budgetItemSchema).max(200) }),
    guests: z.array(guestSchema).max(1000),
    vendors: z.array(vendorSchema).max(100),
    tasks: z.array(taskSchema).max(400),
    concept: conceptSchema,
    ideas: z.array(ideaSchema).max(30),
    aiNotes: aiNoteSchema.nullable(),
    createdAt: z.string().max(40),
    updatedAt: z.string().max(40),
  })
  .superRefine((event, context) => {
    const allowedBudget = new Set(BUDGET_CATEGORIES[event.type].map((category) => category.id));
    for (const [index, item] of event.budget.items.entries()) {
      if (!allowedBudget.has(item.category)) {
        context.addIssue({
          code: 'custom',
          path: ['budget', 'items', index, 'category'],
          message: `Unknown budget category "${item.category}".`,
        });
      }
    }
    const allowedVendors = new Set(VENDOR_CATEGORIES[event.type].map((category) => category.id));
    for (const [index, vendor] of event.vendors.entries()) {
      if (!allowedVendors.has(vendor.category)) {
        context.addIssue({
          code: 'custom',
          path: ['vendors', index, 'category'],
          message: `Unknown vendor category "${vendor.category}".`,
        });
      }
    }
  });

export const workspaceSchema = z
  .object({
    schemaVersion: z.literal(1),
    activeEventId: z.string().nullable().optional().default(null),
    events: z.array(eventSchema).max(12),
  })
  .superRefine((workspace, context) => {
    const ids = new Set<string>();
    for (const [index, event] of workspace.events.entries()) {
      if (ids.has(event.id)) {
        context.addIssue({
          code: 'custom',
          path: ['events', index, 'id'],
          message: 'Event IDs must be unique.',
        });
      }
      ids.add(event.id);
    }
    if (workspace.activeEventId && !ids.has(workspace.activeEventId)) {
      context.addIssue({
        code: 'custom',
        path: ['activeEventId'],
        message: 'The active event does not exist.',
      });
    }
  });

export type ParsedWorkspace = z.infer<typeof workspaceSchema>;

export function validateWorkspace(value: unknown): Workspace {
  return workspaceSchema.parse(value) as Workspace;
}
