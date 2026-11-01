import { PHASE_LABELS, TIMELINE_TEMPLATES } from './catalog';
import {
  addDaysIso,
  daysBetweenIso,
  isValidIsoDate,
  todayIso,
} from './dates';
import type { EventPlan, PlanTask, TimelineStats } from '../types';
import { cleanText, createId } from '../utils';

/**
 * Build a timeline that fits the time actually available. If someone starts
 * planning six months out instead of twelve, milestones are compressed rather
 * than dumped in the past.
 */
export function buildTimeline(
  type: EventPlan['type'],
  eventDate: string,
  now: Date = new Date(),
): PlanTask[] {
  const templates = TIMELINE_TEMPLATES[type];
  const today = todayIso(now);
  if (!isValidIsoDate(eventDate)) return [];

  const availableDays = Math.max(0, daysBetweenIso(today, eventDate));
  const longestLead = Math.max(...templates.map((template) => template.offsetDays), 1);
  const scale = Math.min(1, availableDays / longestLead);
  const eventIsPast = eventDate < today;

  return templates.map((template) => {
    const intended = addDaysIso(eventDate, -Math.round(template.offsetDays * scale));
    let due = intended;
    if (!eventIsPast) {
      // Never create a brand-new task in the past.
      if (due < today) due = today;
      if (due > eventDate) due = eventDate;
    }
    return {
      id: createId('task'),
      title: template.title,
      phase: template.phase,
      due,
      done: false,
      priority: template.priority,
      notes: template.description,
    };
  });
}

export function createTask(input: {
  title: string;
  phase: PlanTask['phase'];
  due: string;
  priority?: PlanTask['priority'];
  notes?: string;
}): PlanTask {
  return {
    id: createId('task'),
    title: cleanText(input.title, 120),
    phase: input.phase,
    due: isValidIsoDate(input.due) ? input.due : todayIso(),
    done: false,
    priority: input.priority ?? 'medium',
    notes: cleanText(input.notes ?? '', 400),
  };
}

/** Move incomplete milestones when the event date changes; keep history intact. */
export function shiftIncompleteTasks(tasks: PlanTask[], deltaDays: number): PlanTask[] {
  if (deltaDays === 0) return tasks;
  return tasks.map((task) =>
    task.done ? task : { ...task, due: addDaysIso(task.due, deltaDays) },
  );
}

export function sortTasks(tasks: PlanTask[]): PlanTask[] {
  const priorityRank: Record<PlanTask['priority'], number> = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.due !== b.due) return a.due.localeCompare(b.due);
    return priorityRank[a.priority] - priorityRank[b.priority];
  });
}

export function computeTimelineStats(
  tasks: PlanTask[],
  eventDate: string,
  now: Date = new Date(),
): TimelineStats {
  const today = todayIso(now);
  const done = tasks.filter((task) => task.done).length;
  const overdue = tasks.filter((task) => !task.done && task.due < today).length;
  const daysUntilEvent = daysBetweenIso(today, eventDate);

  return {
    total: tasks.length,
    done,
    overdue,
    completion: tasks.length === 0 ? 0 : done / tasks.length,
    next: sortTasks(tasks.filter((task) => !task.done)).slice(0, 4),
    daysUntilEvent,
    eventIsPast: daysUntilEvent < 0,
  };
}

/* ------------------------------------------------------------------ */
/* Calendar export                                                     */
/* ------------------------------------------------------------------ */

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const output: string[] = [];
  let current = '';
  let currentBytes = 0;

  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (currentBytes + bytes > 73) {
      output.push(current);
      current = ` ${char}`;
      currentBytes = 1 + bytes;
    } else {
      current += char;
      currentBytes += bytes;
    }
  }
  output.push(current);
  return output.join('\r\n');
}

function icsDate(iso: string): string {
  return iso.replace(/-/g, '');
}

function utcStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildTimelineIcs(event: EventPlan, now: Date = new Date()): string {
  const stamp = utcStamp(now);
  const safeId = event.id.replace(/&/g, 'and').replace(/[^a-zA-Z0-9_-]/g, '');
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gala Studio//Event Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(`${event.basics.name} — Gala plan`)}`,
  ];

  const eventEnd = addDaysIso(event.basics.date, 1);
  lines.push(
    'BEGIN:VEVENT',
    `UID:gala-event-${safeId}@gala.studio`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(event.basics.date)}`,
    `DTEND;VALUE=DATE:${icsDate(eventEnd)}`,
    foldIcsLine(`SUMMARY:${escapeIcsText(event.basics.name)}`),
    foldIcsLine(`LOCATION:${escapeIcsText(event.basics.location || 'To be confirmed')}`),
    foldIcsLine(`DESCRIPTION:${escapeIcsText(event.concept.summary)}`),
    'END:VEVENT',
  );

  for (const task of event.tasks) {
    if (!isValidIsoDate(task.due)) continue;
    lines.push(
      'BEGIN:VEVENT',
      `UID:gala-task-${task.id.replace(/&/g, 'and').replace(/[^a-zA-Z0-9_-]/g, '')}@gala.studio`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(task.due)}`,
      `DTEND;VALUE=DATE:${icsDate(addDaysIso(task.due, 1))}`,
      foldIcsLine(`SUMMARY:${escapeIcsText(task.done ? `✓ ${task.title}` : task.title)}`),
      foldIcsLine(
        `DESCRIPTION:${escapeIcsText(
          `${PHASE_LABELS[task.phase]} — ${task.priority} priority\n${task.notes}`.trim(),
        )}`,
      ),
      `STATUS:${task.done ? 'COMPLETED' : 'CONFIRMED'}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
