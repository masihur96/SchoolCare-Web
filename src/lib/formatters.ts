/**
 * UI Formatting & Sanitization Utilities
 * Ensures internal UUIDs, ObjectIds, and database hashes are never exposed to the end-user UI.
 */

// Matches standard 36-char UUID (e.g. 123e4567-e89b-12d3-a456-426614174000)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Matches 24-character hexadecimal MongoDB ObjectId or 32+ hex hashes
const HEX_HASH_REGEX = /^[0-9a-f]{24,64}$/i;

/**
 * Checks whether a given string is a raw technical identifier (UUID, Mongo ObjectId, or hash).
 */
export function isTechnicalId(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.length === 0) return false;
  if (UUID_REGEX.test(trimmed)) return true;
  if (HEX_HASH_REGEX.test(trimmed)) return true;
  if (trimmed.length >= 24 && /^[0-9a-f-]+$/i.test(trimmed)) return true;
  return false;
}

/**
 * Returns a human-friendly display name, discarding technical UUIDs/hashes if passed as fallback.
 */
export function sanitizeDisplayName(name?: string | null, fallback: string = 'Institutional Record'): string {
  if (!name || typeof name !== 'string') return fallback;
  const trimmed = name.trim();
  if (trimmed.length === 0 || isTechnicalId(trimmed)) {
    return fallback;
  }
  return trimmed;
}

/**
 * Formats an institutional code. If the code is a UUID or hex hash, returns null or fallback.
 */
export function sanitizeCode(code?: string | null, fallback: string | null = null): string | null {
  if (!code || typeof code !== 'string') return fallback;
  const trimmed = code.trim();
  if (trimmed.length === 0 || isTechnicalId(trimmed)) {
    return fallback;
  }
  return trimmed;
}

/**
 * Formats currency in Bangladeshi Taka (BDT)
 */
export function formatBDT(amount?: number | string | null): string {
  if (amount === null || amount === undefined || amount === '') return '৳ 0';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num)) return '৳ 0';
  return `৳ ${num.toLocaleString()}`;
}

/**
 * Formats dates into clean, executive friendly strings
 */
export function formatFriendlyDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Formats timestamps with time
 */
export function formatFriendlyDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}
