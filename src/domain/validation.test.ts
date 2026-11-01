import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import type { Workspace } from '../types';
import { createSampleEvent, initialWorkspace } from './factory';
import { validateWorkspace, workspaceSchema } from './validation';

const FIXED_NOW = new Date(2026, 10, 1, 10, 0, 0);

function workspace(): Workspace {
  return initialWorkspace(FIXED_NOW);
}

function clone(): Workspace {
  return structuredClone(workspace());
}

describe('workspace validation', () => {
  it('accepts the sample workspace and preserves its data', () => {
    const sample = workspace();
    const validated = validateWorkspace(sample);
    expect(validated.schemaVersion).toBe(1);
    expect(validated.activeEventId).toBe(sample.events[0].id);
    expect(validated.events[0].basics.name).toBe('Maya & Arjun’s garden wedding');
    expect(validated.events[0].vendors.length).toBe(4);
  });

  it('rejects unknown budget and vendor categories', () => {
    const badBudget = clone();
    badBudget.events[0].budget.items[0].category = 'unknown';
    expect(() => validateWorkspace(badBudget)).toThrow(ZodError);

    const badVendor = clone();
    badVendor.events[0].vendors[0].category = 'unknown';
    expect(() => validateWorkspace(badVendor)).toThrow(
      /Unknown vendor category.*unknown/,
    );
  });

  it('rejects duplicate event IDs and a dangling active event', () => {
    const duplicate = clone();
    duplicate.events.push(createSampleEvent(FIXED_NOW) as never);
    duplicate.events[1].id = duplicate.events[0].id;
    expect(() => validateWorkspace(duplicate)).toThrow(/Event IDs must be unique/);

    const dangling = clone();
    dangling.activeEventId = 'event_missing';
    expect(() => validateWorkspace(dangling)).toThrow(/active event does not exist/);
  });

  it('validates dates, numbers, and bounded text', () => {
    const impossibleDate = clone();
    impossibleDate.events[0].basics.date = '2026-02-30';
    expect(() => validateWorkspace(impossibleDate)).toThrow(/does not exist/);

    const badDate = clone();
    badDate.events[0].tasks[0].due = '01/02/2027';
    expect(() => validateWorkspace(badDate)).toThrow(/YYYY-MM-DD/);

    const negativeMoney = clone();
    negativeMoney.events[0].budget.items[0].estimated = -1;
    expect(() => validateWorkspace(negativeMoney)).toThrow();

    const fractionalMoney = clone();
    fractionalMoney.events[0].basics.budget = 100.5;
    expect(() => validateWorkspace(fractionalMoney)).toThrow();

    const longName = clone();
    longName.events[0].basics.name = 'x'.repeat(81);
    expect(() => validateWorkspace(longName)).toThrow();

    const duplicateGuestId = clone();
    duplicateGuestId.events[0].guests[1].id = duplicateGuestId.events[0].guests[0].id;
    expect(workspaceSchema.safeParse(duplicateGuestId).success).toBe(true);
  });

  it('rejects invalid enums, colours, and schemas versions', () => {
    const badEnum = clone() as unknown as { events: Array<{ type: string }> };
    badEnum.events[0].type = 'festival';
    expect(() => validateWorkspace(badEnum)).toThrow();

    const badColour = clone();
    badColour.events[0].concept.palette[0] = 'plum';
    expect(() => validateWorkspace(badColour)).toThrow(/six-digit hex/);

    const badVersion = clone() as unknown as { schemaVersion: number };
    badVersion.schemaVersion = 2;
    expect(() => validateWorkspace(badVersion)).toThrow();
  });

  it('caps collections at deliberate limits', () => {
    const tooManyEvents = clone();
    while (tooManyEvents.events.length < 13) {
      const next = createSampleEvent(FIXED_NOW);
      next.id = `event_${tooManyEvents.events.length}`;
      tooManyEvents.events.push(next);
    }
    expect(() => validateWorkspace(tooManyEvents)).toThrow();
  });
});
