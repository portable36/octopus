export class Sku {
  private constructor(private readonly value: string) {}

  public static create(value: string): Sku {
    const normalized = value.trim().toUpperCase();
    const skuRegex = /^[A-Z]{3}-[A-Z]{3}-\d{4}$/;
    if (!normalized || !skuRegex.test(normalized)) {
      throw new Error('Invalid SKU format structure.');
    }
    return new Sku(normalized);
  }

  public getRawValue(): string {
    return this.value;
  }
}
