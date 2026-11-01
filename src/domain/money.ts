import type { CurrencyCode } from '../types';

const FRACTION_DIGITS: Record<CurrencyCode, number> = {
  USD: 0,
  EUR: 0,
  GBP: 0,
  INR: 0,
  AUD: 0,
  CAD: 0,
};

export function formatMoney(
  value: number,
  currency: CurrencyCode = 'USD',
  showCents = false,
): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: showCents ? 2 : FRACTION_DIGITS[currency],
    maximumFractionDigits: showCents ? 2 : FRACTION_DIGITS[currency],
  }).format(safeValue);
}

/** Compact money for chart labels: $32k, $4.5k, $280. */
export function formatMoneyCompact(value: number, currency: CurrencyCode = 'USD'): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  if (Math.abs(safeValue) < 1000) return formatMoney(safeValue, currency);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(safeValue);
}

export function formatPercent(value: number, fractionDigits = 0): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue.toFixed(fractionDigits)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Number.isFinite(value) ? value : 0);
}

export function parseMoney(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  if (cleaned.trim() === '') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}
