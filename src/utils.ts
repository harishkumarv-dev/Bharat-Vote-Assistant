/** Small, safe helpers shared across the planning engine. */

export function createId(prefix = 'id'): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}_${cryptoApi.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Clamp a number between a minimum and maximum. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Remove contact details from free text before it is shown to an AI provider.
 * The app never sends guest rows, but a host could paste details into notes.
 */
export function redactContactDetails(value: string): string {
  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  const phonePattern =
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?|\d{2,4}[\s.-])\d{3,4}[\s.-]?\d{3,4}|\b\d{10,15}\b/g;
  return value
    .replace(emailPattern, '[email removed]')
    .replace(phonePattern, '[phone removed]');
}

/** Round to a whole unit and guard against NaN/Infinity. */
export function safeWhole(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

/** Trim and collapse user-provided text without changing its meaning. */
export function cleanText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/**
 * Deterministic 32-bit hash. Used to choose a concept from equally suitable
 * options so that the same event always receives the same recommendation.
 */
export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Pick a deterministic entry from a non-empty array. */
export function pickDeterministic<T>(items: T[], seed: string): T {
  if (items.length === 0) {
    throw new Error('pickDeterministic requires at least one item');
  }
  return items[hashString(seed) % items.length];
}

export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}
