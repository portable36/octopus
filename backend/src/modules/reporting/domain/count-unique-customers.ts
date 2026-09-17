/** Distinct authenticated buyers in a reporting fact window (guest rows omit customerId). */
export function countUniqueCustomers(
  rows: readonly { readonly customerId: string | null }[],
): number {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.customerId) {
      ids.add(row.customerId);
    }
  }
  return ids.size;
}
