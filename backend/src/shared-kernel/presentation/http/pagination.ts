/** Shared list/query bounds for admin and vendor list endpoints. */
export const DEFAULT_LIST_LIMIT = 50;
export const MAX_LIST_LIMIT = 200;

export function clampLimit(
  raw: string | number | undefined,
  fallback: number = DEFAULT_LIST_LIMIT,
  max: number = MAX_LIST_LIMIT,
): number {
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) {
    return fallback;
  }
  return Math.min(Math.trunc(n), max);
}

export function clampOffset(raw: string | number | undefined, fallback = 0): number {
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 0) {
    return fallback;
  }
  return Math.trunc(n);
}
