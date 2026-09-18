/** Parse Pathao merchant price-plan payload (major BDT units → minor). */
export function parsePathaoPricePlan(data: {
  readonly price?: number;
  readonly discount?: number;
  readonly final_price?: number;
}): {
  readonly priceMinor: number;
  readonly discountMinor: number;
  readonly finalPriceMinor: number;
  readonly currencyCode: 'BDT';
} {
  const price = typeof data.price === 'number' ? data.price : 0;
  const discount = typeof data.discount === 'number' ? data.discount : 0;
  const final =
    typeof data.final_price === 'number' ? data.final_price : Math.max(0, price - discount);
  return {
    priceMinor: Math.round(price * 100),
    discountMinor: Math.round(discount * 100),
    finalPriceMinor: Math.round(final * 100),
    currencyCode: 'BDT',
  };
}
