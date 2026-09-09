/** Normalize user/admin color input to `#rrggbb` for CSS and `<input type="color">`. */
export function normalizeCssHexColor(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const hex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((ch) => `${ch}${ch}`)
          .join('')
      : hex;
  return `#${full.toLowerCase()}`;
}

/** Value safe for controlled `<input type="color">` (always `#rrggbb`). */
export function colorInputValue(raw: string | null | undefined, fallback: string): string {
  return normalizeCssHexColor(raw) ?? normalizeCssHexColor(fallback) ?? '#000000';
}
