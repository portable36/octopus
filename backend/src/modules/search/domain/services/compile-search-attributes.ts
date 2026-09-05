export type SearchAttributeAssignment = {
  readonly code: string;
  readonly value: string | number | boolean | readonly string[];
};

function isAttributeAssignment(value: unknown): value is SearchAttributeAssignment {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record['code'] === 'string' && record['value'] !== undefined;
}

export function parseCatalogAttributes(
  raw: readonly unknown[],
): readonly SearchAttributeAssignment[] {
  return raw.filter(isAttributeAssignment);
}

/** Flatten nested attribute values into `code: value` tokens for semantic search. */
export function compileSearchAttributes(
  attributes: readonly SearchAttributeAssignment[],
): readonly string[] {
  const tokens: string[] = [];
  for (const attribute of attributes) {
    const code = attribute.code.trim();
    if (!code) {
      continue;
    }
    const values = flattenAttributeValue(attribute.value);
    for (const value of values) {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        tokens.push(`${code}: ${trimmed}`);
      }
    }
  }
  return tokens;
}

function flattenAttributeValue(value: string | number | boolean | readonly string[]): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => flattenAttributeValue(entry));
  }
  if (typeof value === 'boolean') {
    return [value ? 'yes' : 'no'];
  }
  return [String(value)];
}
