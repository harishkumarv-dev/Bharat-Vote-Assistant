import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  formatMoneyCompact,
  formatNumber,
  formatPercent,
  parseMoney,
  sum,
} from './money';

describe('money calculations and formatting', () => {
  it('formats whole currency values correctly', () => {
    expect(formatMoney(25000, 'USD')).toBe('$25,000');
    expect(formatMoney(1500, 'EUR')).toBe('€1,500');
    expect(formatMoney(50000, 'INR')).toBe('₹50,000');
    expect(formatMoney(0, 'USD')).toBe('$0');
  });

  it('formats compact money for charts and summaries', () => {
    expect(formatMoneyCompact(25000, 'USD')).toBe('$25K');
    expect(formatMoneyCompact(450, 'USD')).toBe('$450');
    expect(formatMoneyCompact(1500000, 'USD')).toBe('$1.5M');
  });

  it('safely handles non-finite numbers', () => {
    expect(formatMoney(NaN, 'USD')).toBe('$0');
    expect(formatMoney(Infinity, 'USD')).toBe('$0');
    expect(formatMoneyCompact(-Infinity, 'USD')).toBe('$0');
  });

  it('formats percentages with optional fraction precision', () => {
    expect(formatPercent(45)).toBe('45%');
    expect(formatPercent(82.64, 1)).toBe('82.6%');
    expect(formatPercent(NaN)).toBe('0%');
  });

  it('formats numbers with comma separators', () => {
    expect(formatNumber(12500)).toBe('12,500');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(NaN)).toBe('0');
  });

  it('parses formatted money strings into clean non-negative integers', () => {
    expect(parseMoney('$25,000')).toBe(25000);
    expect(parseMoney('€ 1,500.50')).toBe(1501);
    expect(parseMoney('₹50,000')).toBe(50000);
    expect(parseMoney('-500')).toBe(0);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
  });

  it('computes safe array sums ignoring non-finite values', () => {
    expect(sum([100, 250, 50])).toBe(400);
    expect(sum([])).toBe(0);
    expect(sum([100, NaN, 50, Infinity])).toBe(150);
  });
});
