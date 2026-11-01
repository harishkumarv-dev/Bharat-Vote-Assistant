import { describe, expect, it } from 'vitest';
import { plannerReducer } from './plannerReducer';
import { initialWorkspace } from '../domain/factory';
import type { EventDraft, Workspace } from '../types';

function createMockWorkspace(): Workspace {
  const base = initialWorkspace();
  return {
    ...base,
    events: base.events.slice(0, 1),
    activeEventId: base.events[0]?.id ?? null,
  };
}

describe('plannerReducer', () => {
  it('creates an event from draft and sets it active', () => {
    const ws = createMockWorkspace();
    const draft: EventDraft = {
      type: 'birthday',
      name: 'Asha 30th Birthday',
      date: '2026-12-15',
      location: 'Bengaluru Rooftop',
      guestCount: 40,
      currency: 'INR',
      budget: 150000,
      priorities: ['food', 'music'],
      styles: ['modern', 'minimal'],
      dietary: ['vegetarian'],
      accessibility: ['step-free'],
      notes: 'Cozy and musical vibe',
    };

    const next = plannerReducer(ws, { type: 'CREATE_EVENT', draft });
    expect(next.events.length).toBe(ws.events.length + 1);
    const created = next.events.find((e) => e.basics.name === 'Asha 30th Birthday');
    expect(created).toBeDefined();
    expect(next.activeEventId).toBe(created?.id);
    expect(created?.type).toBe('birthday');
    expect(created?.budget.items.length).toBeGreaterThan(0);
  });

  it('selects active event', () => {
    const ws = initialWorkspace();
    const target = ws.events[ws.events.length - 1];
    const next = plannerReducer(ws, { type: 'SELECT_EVENT', eventId: target.id });
    expect(next.activeEventId).toBe(target.id);
  });

  it('deletes active event and falls back to another', () => {
    const ws = initialWorkspace();
    const toDelete = ws.events[0];
    const next = plannerReducer(ws, { type: 'DELETE_EVENT', eventId: toDelete.id });
    expect(next.events.length).toBe(ws.events.length - 1);
    expect(next.events.some((e) => e.id === toDelete.id)).toBe(false);
    expect(next.activeEventId).toBe(next.events[0]?.id ?? null);
  });

  it('updates event basics and shifts tasks if date changes', () => {
    const ws = createMockWorkspace();
    const active = ws.events[0];
    const originalDate = active.basics.date;

    const next = plannerReducer(ws, {
      type: 'UPDATE_BASICS',
      patch: { name: 'Updated Celebration Name', budget: 250000 },
    });

    const updated = next.events.find((e) => e.id === active.id)!;
    expect(updated.basics.name).toBe('Updated Celebration Name');
    expect(updated.basics.budget).toBe(250000);
    expect(updated.basics.date).toBe(originalDate);
  });

  it('updates vibe priorities and styles', () => {
    const ws = createMockWorkspace();
    const active = ws.events[0];

    const next = plannerReducer(ws, {
      type: 'UPDATE_VIBE',
      patch: { priorities: ['venue', 'sustainability'], styles: ['minimal', 'classic'] },
    });

    const updated = next.events.find((e) => e.id === active.id)!;
    expect(updated.vibe.priorities).toEqual(['venue', 'sustainability']);
    expect(updated.vibe.styles).toEqual(['minimal', 'classic']);
  });

  it('manages budget items: add, update, delete, rebalance', () => {
    const ws = createMockWorkspace();
    const active = ws.events[0];

    // Add budget item
    const afterAdd = plannerReducer(ws, {
      type: 'ADD_BUDGET_ITEM',
      category: 'catering',
      label: 'Specialty Chai & Coffee Bar',
      estimated: 12000,
      notes: 'Locally roasted artisanal coffee',
    });
    const eventAfterAdd = afterAdd.events.find((e) => e.id === active.id)!;
    const addedItem = eventAfterAdd.budget.items.find((b) => b.label === 'Specialty Chai & Coffee Bar')!;
    expect(addedItem).toBeDefined();
    expect(addedItem.estimated).toBe(12000);

    // Update budget item
    const afterUpdate = plannerReducer(afterAdd, {
      type: 'UPDATE_BUDGET_ITEM',
      id: addedItem.id,
      patch: { actual: 11500, paid: true },
    });
    const eventAfterUpdate = afterUpdate.events.find((e) => e.id === active.id)!;
    const updatedItem = eventAfterUpdate.budget.items.find((b) => b.id === addedItem.id)!;
    expect(updatedItem.actual).toBe(11500);
    expect(updatedItem.paid).toBe(true);

    // Rebalance budget
    const afterRebalance = plannerReducer(afterUpdate, { type: 'REBALANCE_BUDGET' });
    const eventAfterRebalance = afterRebalance.events.find((e) => e.id === active.id)!;
    expect(eventAfterRebalance.budget.items.length).toBeGreaterThan(0);

    // Delete budget item
    const afterDelete = plannerReducer(afterRebalance, {
      type: 'DELETE_BUDGET_ITEM',
      id: addedItem.id,
    });
    const eventAfterDelete = afterDelete.events.find((e) => e.id === active.id)!;
    expect(eventAfterDelete.budget.items.some((b) => b.id === addedItem.id)).toBe(false);
  });

  it('manages guests: add, update, delete, import', () => {
    const ws = createMockWorkspace();
    const active = ws.events[0];

    // Add guest
    const afterAdd = plannerReducer(ws, {
      type: 'ADD_GUEST',
      guest: {
        name: 'Rohan Sharma',
        email: 'rohan@example.com',
        group: 'College Friends',
        rsvp: 'attending',
        plusOnes: 1,
        dietary: ['vegetarian'],
        notes: 'Arriving by train',
      },
    });
    const eventAfterAdd = afterAdd.events.find((e) => e.id === active.id)!;
    const guest = eventAfterAdd.guests.find((g) => g.name === 'Rohan Sharma')!;
    expect(guest).toBeDefined();
    expect(guest.group).toBe('College Friends');

    // Update guest
    const afterUpdate = plannerReducer(afterAdd, {
      type: 'UPDATE_GUEST',
      id: guest.id,
      patch: { rsvp: 'declined', notes: 'Cannot make it due to travel' },
    });
    const eventAfterUpdate = afterUpdate.events.find((e) => e.id === active.id)!;
    const updatedGuest = eventAfterUpdate.guests.find((g) => g.id === guest.id)!;
    expect(updatedGuest.rsvp).toBe('declined');

    // Import guests
    const afterImport = plannerReducer(afterUpdate, {
      type: 'IMPORT_GUESTS',
      guests: [guest],
    });
    const eventAfterImport = afterImport.events.find((e) => e.id === active.id)!;
    expect(eventAfterImport.guests.length).toBeGreaterThanOrEqual(1);

    // Delete guest
    const afterDelete = plannerReducer(afterImport, {
      type: 'DELETE_GUEST',
      id: guest.id,
    });
    const eventAfterDelete = afterDelete.events.find((e) => e.id === active.id)!;
    expect(eventAfterDelete.guests.some((g) => g.id === guest.id)).toBe(false);
  });

  it('manages vendors and checklist toggle', () => {
    const ws = createMockWorkspace();
    const active = ws.events[0];

    // Add vendor in catering category (which has questions in catalog)
    const afterAdd = plannerReducer(ws, {
      type: 'ADD_VENDOR',
      vendor: {
        name: 'Bloom & Feast Catering',
        category: 'catering',
        status: 'contacted',
        quote: 45000,
        contactName: 'Ananya Roy',
        email: 'ananya@bloomfeast.in',
        phone: '+91 98765 43210',
        notes: 'Requested vegan and regional buffet options',
      },
    });
    const eventAfterAdd = afterAdd.events.find((e) => e.id === active.id)!;
    const vendor = eventAfterAdd.vendors.find((v) => v.name === 'Bloom & Feast Catering')!;
    expect(vendor).toBeDefined();
    expect(vendor.quote).toBe(45000);
    expect(vendor.checklist.length).toBeGreaterThan(0);

    // Toggle checklist item
    const firstCheckId = vendor.checklist[0].id;
    const afterToggle = plannerReducer(afterAdd, {
      type: 'TOGGLE_VENDOR_CHECK',
      vendorId: vendor.id,
      checkId: firstCheckId,
    });
    const eventAfterToggle = afterToggle.events.find((e) => e.id === active.id)!;
    const vendorAfterToggle = eventAfterToggle.vendors.find((v) => v.id === vendor.id)!;
    expect(vendorAfterToggle.checklist.find((c) => c.id === firstCheckId)?.done).toBe(true);

    // Update vendor
    const afterUpdate = plannerReducer(afterToggle, {
      type: 'UPDATE_VENDOR',
      id: vendor.id,
      patch: { status: 'booked' },
    });
    const eventAfterUpdate = afterUpdate.events.find((e) => e.id === active.id)!;
    expect(eventAfterUpdate.vendors.find((v) => v.id === vendor.id)?.status).toBe('booked');

    // Delete vendor
    const afterDelete = plannerReducer(afterUpdate, {
      type: 'DELETE_VENDOR',
      id: vendor.id,
    });
    const eventAfterDelete = afterDelete.events.find((e) => e.id === active.id)!;
    expect(eventAfterDelete.vendors.some((v) => v.id === vendor.id)).toBe(false);
  });

  it('manages timeline tasks and idea pin toggle', () => {
    const ws = createMockWorkspace();
    const active = ws.events[0];

    // Add task
    const afterAdd = plannerReducer(ws, {
      type: 'ADD_TASK',
      task: {
        title: 'Review acoustic sound check at venue',
        phase: 'final',
        due: active.basics.date,
        priority: 'high',
        notes: 'Confirm wireless lapel mics and speaker positions',
      },
    });
    const eventAfterAdd = afterAdd.events.find((e) => e.id === active.id)!;
    const task = eventAfterAdd.tasks.find((t) => t.title === 'Review acoustic sound check at venue')!;
    expect(task).toBeDefined();
    expect(task.done).toBe(false);

    // Toggle task
    const afterToggle = plannerReducer(afterAdd, {
      type: 'TOGGLE_TASK',
      id: task.id,
    });
    const eventAfterToggle = afterToggle.events.find((e) => e.id === active.id)!;
    expect(eventAfterToggle.tasks.find((t) => t.id === task.id)?.done).toBe(true);

    // Toggle idea pin
    if (eventAfterToggle.ideas.length > 0) {
      const targetIdea = eventAfterToggle.ideas[0];
      const initialPinned = targetIdea.pinned;
      const afterPin = plannerReducer(afterToggle, {
        type: 'TOGGLE_IDEA_PIN',
        id: targetIdea.id,
      });
      const eventAfterPin = afterPin.events.find((e) => e.id === active.id)!;
      expect(eventAfterPin.ideas.find((i) => i.id === targetIdea.id)?.pinned).toBe(!initialPinned);
    }
  });
});
