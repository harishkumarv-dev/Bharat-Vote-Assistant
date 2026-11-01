import { DIETARY_LABELS } from './catalog';
import type { DietaryNeed, Guest, GuestStats, RsvpStatus } from '../types';
import { createId, cleanText } from '../utils';

const RSVP_ALIASES: Record<string, RsvpStatus> = {
  attending: 'attending',
  yes: 'attending',
  y: 'attending',
  maybe: 'maybe',
  'not sure': 'maybe',
  declined: 'declined',
  no: 'declined',
  n: 'declined',
  pending: 'pending',
  'awaiting reply': 'pending',
};

function dietaryKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

const DIETARY_ALIASES = new Map<string, DietaryNeed>();
for (const need of Object.keys(DIETARY_LABELS) as DietaryNeed[]) {
  DIETARY_ALIASES.set(dietaryKey(need), need);
  DIETARY_ALIASES.set(dietaryKey(DIETARY_LABELS[need]), need);
}

export interface GuestInput {
  name: string;
  email?: string;
  group?: string;
  rsvp?: RsvpStatus;
  plusOnes?: number;
  dietary?: DietaryNeed[];
  notes?: string;
}

export function createGuest(input: GuestInput): Guest {
  return {
    id: createId('guest'),
    name: cleanText(input.name, 80),
    email: cleanText(input.email ?? '', 120),
    group: cleanText(input.group ?? '', 40),
    rsvp: input.rsvp ?? 'pending',
    plusOnes: Math.min(10, Math.max(0, Math.round(input.plusOnes ?? 0))),
    dietary: Array.from(new Set(input.dietary ?? [])),
    notes: cleanText(input.notes ?? '', 300),
  };
}

export function computeGuestStats(guests: Guest[]): GuestStats {
  let attending = 0;
  let maybe = 0;
  let declined = 0;
  let pending = 0;
  let attendingHeadcount = 0;
  let hasPlusOnes = false;
  const dietaryCounts = new Map<DietaryNeed, number>();

  for (const guest of guests) {
    if (guest.rsvp === 'attending') attending += 1;
    else if (guest.rsvp === 'maybe') maybe += 1;
    else if (guest.rsvp === 'declined') declined += 1;
    else pending += 1;

    if (guest.rsvp === 'attending') {
      attendingHeadcount += 1 + guest.plusOnes;
    }
    if (guest.plusOnes > 0) hasPlusOnes = true;

    if (guest.rsvp === 'attending' || guest.rsvp === 'maybe') {
      for (const need of guest.dietary) {
        dietaryCounts.set(need, (dietaryCounts.get(need) ?? 0) + 1 + guest.plusOnes);
      }
    }
  }

  const known = attending + maybe + declined;
  return {
    invited: guests.length,
    attending,
    maybe,
    declined,
    pending,
    attendingHeadcount,
    knownRatio: guests.length === 0 ? 0 : known / guests.length,
    dietary: Array.from(dietaryCounts.entries())
      .map(([need, count]) => ({ need, count }))
      .sort((a, b) => b.count - a.count),
    hasPlusOnes,
  };
}

/** The guest count used for per-head and variable-cost calculations. */
export function effectiveGuestCount(guests: Guest[], plannedGuestCount: number): number {
  const attending = guests
    .filter((guest) => guest.rsvp === 'attending')
    .reduce((total, guest) => total + 1 + guest.plusOnes, 0);
  return Math.max(1, attending > 0 ? attending : plannedGuestCount);
}

/* ------------------------------------------------------------------ */
/* CSV import & export                                                 */
/* ------------------------------------------------------------------ */

export class CsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvError';
  }
}

const MAX_CSV_SIZE = 500_000;
const MAX_ROWS = 600;
const CSV_HEADERS = ['name', 'email', 'group', 'rsvp', 'plusOnes', 'dietary', 'notes'] as const;

/**
 * RFC-4180-ish CSV parser. Handles quoted commas, escaped quotes, and
 * newlines inside quoted fields without evaluating anything.
 */
export function parseCsv(text: string): string[][] {
  if (text.length > MAX_CSV_SIZE) {
    throw new CsvError('That file is too large. Please import fewer than 600 guests.');
  }

  const source = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      if (field.length > 0) {
        throw new CsvError('A quoted value must start at the beginning of a field.');
      }
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      field = '';
      if (rows.length > MAX_ROWS + 1) {
        throw new CsvError(`Please import ${MAX_ROWS} guests or fewer at a time.`);
      }
    } else {
      field += char;
    }
  }

  if (inQuotes) throw new CsvError('A quoted value is missing its closing quote.');

  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  if (rows.length > MAX_ROWS + 1) {
    throw new CsvError(`Please import ${MAX_ROWS} guests or fewer at a time.`);
  }
  return rows;
}

function normaliseHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function parseDietary(value: string): DietaryNeed[] {
  return Array.from(
    new Set(
      value
        .split(/[;|]/)
        .map((part) => dietaryKey(part))
        .filter(Boolean)
        .map((part) => DIETARY_ALIASES.get(part))
        .filter((need): need is DietaryNeed => Boolean(need)),
    ),
  );
}

export interface GuestImportResult {
  guests: Guest[];
  errors: string[];
  skipped: number;
}

export function parseGuestsCsv(text: string): GuestImportResult {
  const rows = parseCsv(text);
  if (rows.length === 0) throw new CsvError('The file is empty.');

  const headerRow = rows[0].map(normaliseHeader);
  const nameIndex = headerRow.indexOf('name');
  if (nameIndex === -1) {
    throw new CsvError('The CSV needs a "name" column.');
  }

  const indexOf = (header: string): number => headerRow.indexOf(header);
  const guests: Guest[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const name = cleanText(row[nameIndex] ?? '', 80);
    if (!name) {
      skipped += 1;
      if (errors.length < 5) errors.push(`Row ${rowIndex + 1}: missing a name.`);
      continue;
    }

    const plusRaw = indexOf('plusones') >= 0 ? row[indexOf('plusones')] : '0';
    const plusOnes = Number.parseInt(plusRaw || '0', 10);
    const rsvpRaw = (indexOf('rsvp') >= 0 ? row[indexOf('rsvp')] : '').trim().toLowerCase();
    const rsvp = RSVP_ALIASES[rsvpRaw] ?? 'pending';
    const email = cleanText(indexOf('email') >= 0 ? row[indexOf('email')] ?? '' : '', 120);
    const group = cleanText(indexOf('group') >= 0 ? row[indexOf('group')] ?? '' : '', 40);
    const notes = cleanText(indexOf('notes') >= 0 ? row[indexOf('notes')] ?? '' : '', 300);
    const dietary = parseDietary(indexOf('dietary') >= 0 ? row[indexOf('dietary')] ?? '' : '');

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      skipped += 1;
      if (errors.length < 5) errors.push(`Row ${rowIndex + 1}: "${email}" is not a valid email.`);
      continue;
    }

    guests.push(
      createGuest({
        name,
        email,
        group,
        rsvp,
        plusOnes: Number.isFinite(plusOnes) ? plusOnes : 0,
        dietary,
        notes,
      }),
    );
  }

  return { guests, errors, skipped };
}

function escapeCsvCell(value: string | number): string {
  let text = String(value);
  // Neutralise CSV formula injection while keeping ordinary values untouched.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function exportGuestsCsv(guests: Guest[]): string {
  const header = CSV_HEADERS.join(',');
  const rows = guests.map((guest) =>
    [
      guest.name,
      guest.email,
      guest.group,
      guest.rsvp,
      guest.plusOnes,
      guest.dietary.join('; '),
      guest.notes,
    ]
      .map(escapeCsvCell)
      .join(','),
  );
  return `\uFEFF${[header, ...rows].join('\r\n')}\r\n`;
}

export function csvTemplate(): string {
  return [
    'name,email,group,rsvp,plusOnes,dietary,notes',
    'Alex Morgan,alex@example.com,Family,attending,1,vegetarian; gluten-free,Arriving Friday',
    'Sam Lee,,Friends,pending,0,,',
  ].join('\r\n');
}
