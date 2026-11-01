import { z } from 'zod';
import { COST_BANDS, EFFORT_LEVELS } from '../types';
import type { AiBudgetTip, ConceptResult, Idea } from '../types';
import { createId } from '../utils';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const aiPlanSchema = z.object({
  concept: z.object({
    title: z.string().min(2).max(80),
    summary: z.string().min(20).max(600),
    palette: z.array(hex).min(3).max(5),
    signatureMoments: z.array(z.string().min(5).max(200)).min(2).max(5),
  }),
  ideas: z
    .array(
      z.object({
        title: z.string().min(2).max(100),
        description: z.string().min(20).max(400),
        category: z.string().min(2).max(60),
        costBand: z.enum(COST_BANDS),
        effort: z.enum(EFFORT_LEVELS),
        tags: z.array(z.string().min(1).max(30)).max(6),
        whyItFits: z.string().min(10).max(240),
      }),
    )
    .min(3)
    .max(8),
  budgetTips: z
    .array(
      z.object({
        title: z.string().min(2).max(100),
        detail: z.string().min(10).max(400),
        savings: z.number().int().min(0).max(100_000_000).nullable(),
      }),
    )
    .max(5),
  timelineTips: z.array(z.string().min(5).max(240)).max(4),
  vendorTips: z.array(z.string().min(5).max(240)).max(4),
});

export type AiPlanPayload = z.infer<typeof aiPlanSchema>;

export const aiBudgetSchema = z.object({
  summary: z.string().min(10).max(500),
  tips: z
    .array(
      z.object({
        title: z.string().min(2).max(100),
        detail: z.string().min(10).max(400),
        savings: z.number().int().min(0).max(100_000_000).nullable(),
      }),
    )
    .min(1)
    .max(5),
});

export type AiBudgetPayload = z.infer<typeof aiBudgetSchema>;

export const aiEmailSchema = z.object({
  subject: z.string().min(3).max(150),
  body: z.string().min(20).max(2000),
});

export type AiEmailPayload = z.infer<typeof aiEmailSchema>;

export function toConceptResult(
  payload: AiPlanPayload,
): ConceptResult & { budgetTips: AiBudgetTip[]; timelineTips: string[]; vendorTips: string[] } {
  const concept: ConceptResult['concept'] = {
    title: payload.concept.title,
    summary: payload.concept.summary,
    palette: payload.concept.palette,
    signatureMoments: payload.concept.signatureMoments,
    source: 'ai',
  };
  const ideas: Idea[] = payload.ideas.map((idea) => ({
    id: createId('idea'),
    title: idea.title,
    description: idea.description,
    category: idea.category,
    costBand: idea.costBand,
    effort: idea.effort,
    tags: Array.from(new Set(idea.tags)),
    whyItFits: idea.whyItFits,
    source: 'ai' as const,
    pinned: false,
  }));
  return {
    concept,
    ideas,
    budgetTips: payload.budgetTips,
    timelineTips: payload.timelineTips,
    vendorTips: payload.vendorTips,
  };
}

/** Extract a JSON object from model output, tolerating code fences or preamble. */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('The model did not return JSON.');
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}
