const SECRET_KEY_PATTERN =
  /(password|secret|token|authorization|api[_-]?key|refresh|credential|cipher)/i;

export function redactSecrets(
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      out[key] = '[REDACTED]';
      continue;
    }
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      out[key] = redactSecrets(entry as Record<string, unknown>);
      continue;
    }
    out[key] = entry;
  }
  return out;
}
