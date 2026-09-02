/** Normalize request paths for redirect lookup (path only, no query string). */
export function normalizeRequestPath(rawPath: string): string {
  const withoutQuery = rawPath.split('?')[0] ?? '/';
  let decoded = withoutQuery;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    decoded = withoutQuery;
  }
  if (!decoded.startsWith('/')) {
    decoded = `/${decoded}`;
  }
  const trimmed = decoded.replace(/\/+$/, '');
  return trimmed.length === 0 ? '/' : trimmed;
}
