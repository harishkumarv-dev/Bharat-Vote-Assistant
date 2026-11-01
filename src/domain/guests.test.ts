import { describe, expect, it } from 'vitest';
import type { Guest } from '../types';
import {
  CsvError,
  computeGuestStats,
  createGuest,
  csvTemplate,
  effectiveGuestCount,
  exportGuestsCsv,
  parseCsv,
  parseGuestsCsv,
} from './guests';

function guest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: 'guest_test',
    name: 'Test Guest',
    email: '',
    group: '',
    rsvp: 'pending',
    plusOnes: 0,
    dietary: [],
    notes: '',
    ...overrides,
  };
}

describe('guest statistics', () => {
  it('counts replies, headcount, and plus-ones', () => {
    const guests = [
      guest({ id: '1', rsvp: 'attending', plusOnes: 2 }),
      guest({ id: '2', rsvp: 'maybe', plusOnes: 1 }),
      guest({ id: '3', rsvp: 'declined', plusOnes: 4 }),
      guest({ id: '4', rsvp: 'pending' }),
    ];
    const stats = computeGuestStats(guests);

    expect(stats.invited).toBe(4);
    expect(stats.attending).toBe(1);
    expect(stats.maybe).toBe(1);
    expect(stats.declined).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.attendingHeadcount).toBe(3);
    expect(stats.knownRatio).toBeCloseTo(0.75);
    expect(stats.hasPlusOnes).toBe(true);
  });

  it('counts dietary needs for attending and maybe guests, including plus-ones', () => {
    const stats = computeGuestStats([
      guest({ id: '1', rsvp: 'attending', plusOnes: 1, dietary: ['vegan'] }),
      guest({ id: '2', rsvp: 'maybe', dietary: ['vegan', 'nut-free'] }),
      guest({ id: '3', rsvp: 'pending', dietary: ['halal'] }),
      guest({ id: '4', rsvp: 'declined', dietary: ['vegan'] }),
    ]);

    expect(stats.dietary).toEqual([
      { need: 'vegan', count: 3 },
      { need: 'nut-free', count: 1 },
    ]);
  });

  it('returns an empty, safe summary for no guests', () => {
    const stats = computeGuestStats([]);
    expect(stats).toMatchObject({
      invited: 0,
      attendingHeadcount: 0,
      knownRatio: 0,
      dietary: [],
      hasPlusOnes: false,
    });
  });

  it('uses attending headcount when available, otherwise the planned count', () => {
    expect(effectiveGuestCount([], 80)).toBe(80);
    expect(
      effectiveGuestCount(
        [guest({ rsvp: 'attending', plusOnes: 1 }), guest({ rsvp: 'maybe', plusOnes: 4 })],
        80,
      ),
    ).toBe(2);
  });
});

describe('createGuest', () => {
  it('normalises text, dietary duplicates, and plus-one bounds', () => {
    const created = createGuest({
      name: '  Priya   Raman ',
      email: ' priya@example.com ',
      group: ' Family ',
      rsvp: 'attending',
      plusOnes: 99,
      dietary: ['vegan', 'vegan', 'gluten-free'],
      notes: '  Arriving\n Friday ',
    });

    expect(created.name).toBe('Priya Raman');
    expect(created.email).toBe('priya@example.com');
    expect(created.group).toBe('Family');
    expect(created.plusOnes).toBe(10);
    expect(created.dietary).toEqual(['vegan', 'gluten-free']);
    expect(created.notes).toBe('Arriving Friday');
    expect(created.name.length).toBeLessThanOrEqual(80);
  });

  it('defaults missing values safely', () => {
    const created = createGuest({ name: 'Sam', plusOnes: -4 });
    expect(created.rsvp).toBe('pending');
    expect(created.plusOnes).toBe(0);
    expect(created.dietary).toEqual([]);
  });
});

describe('CSV parsing', () => {
  it('supports quoted commas, escaped quotes, and newlines', () => {
    const rows = parseCsv('name,notes\r\n"Lee, Sam","Said ""hello""\nThen left"\r\n');
    expect(rows).toEqual([
      ['name', 'notes'],
      ['Lee, Sam', 'Said "hello"\nThen left'],
    ]);
  });

  it('strips a byte-order mark and ignores blank rows', () => {
    const rows = parseCsv('\uFEFFname,email\n\nAlex,alex@example.com\n');
    expect(rows).toEqual([
      ['name', 'email'],
      ['Alex', 'alex@example.com'],
    ]);
  });

  it('rejects unmatched quotes and oversized input', () => {
    expect(() => parseCsv('name\n"unclosed')).toThrow(CsvError);
    expect(() => parseCsv('x'.repeat(500_001))).toThrow(/too large/i);
  });

  it('requires a name column', () => {
    expect(() => parseGuestsCsv('email\nalex@example.com')).toThrow(/name/i);
    expect(() => parseGuestsCsv('')).toThrow(/empty/i);
  });

  it('imports aliases, skips invalid emails, and reports row problems', () => {
    const result = parseGuestsCsv(
      [
        'name,email,group,rsvp,plusOnes,dietary,notes',
        'Alex Morgan,alex@example.com,Family,yes,2,vegetarian; gluten free,Arriving Friday',
        'Sam Lee,sam@example.com,Friends,no,0,,',
        'Jordan,,,not sure,1,vegan,',
        'Bad Email,not-an-email,,,,,',
        ',,,attending,,,',
      ].join('\n'),
    );

    expect(result.guests).toHaveLength(3);
    expect(result.skipped).toBe(2);
    expect(result.errors).toHaveLength(2);
    expect(result.guests[0]).toMatchObject({
      name: 'Alex Morgan',
      group: 'Family',
      rsvp: 'attending',
      plusOnes: 2,
      dietary: ['vegetarian', 'gluten-free'],
      notes: 'Arriving Friday',
    });
    expect(result.guests[1].rsvp).toBe('declined');
    expect(result.guests[2].rsvp).toBe('maybe');
    expect(result.errors[0]).toMatch(/not a valid email/);
    expect(result.errors[1]).toMatch(/missing a name/);
  });

  it('defaults unknown replies to pending and clamps plus-ones', () => {
    const result = parseGuestsCsv('name,rsvp,plusOnes\nAlex,something,99');
    expect(result.guests[0].rsvp).toBe('pending');
    expect(result.guests[0].plusOnes).toBe(10);
  });
});

describe('CSV export', () => {
  it('neutralises spreadsheet formulas and escapes dangerous characters', () => {
    const csv = exportGuestsCsv([
      guest({
        name: '=HYPERLINK("https://example.com")',
        email: 'alex@example.com',
        notes: 'Line one,\nline two',
        group: '+team',
      }),
    ]);

    expect(csv.startsWith('\uFEFFname,email,group,rsvp,plusOnes,dietary,notes')).toBe(true);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"Line one,\nline two"');
    expect(csv).toContain("'+team");
    expect(csv).toContain('\r\n');
  });

  it('round-trips a normal guest list', () => {
    const guests = [
      guest({ name: 'Alex Morgan', email: 'alex@example.com', group: 'Family' }),
      guest({ name: 'Sam, Lee', dietary: ['vegan', 'gluten-free'] }),
    ];
    const result = parseGuestsCsv(exportGuestsCsv(guests));
    expect(result.guests.map((entry) => entry.name)).toEqual(['Alex Morgan', 'Sam, Lee']);
    expect(result.guests[1].dietary).toEqual(['vegan', 'gluten-free']);
  });

  it('provides a documented template', () => {
    const template = csvTemplate();
    expect(template).toContain('name,email,group,rsvp,plusOnes,dietary,notes');
    expect(parseGuestsCsv(template).guests.length).toBeGreaterThan(0);
  });
});
