// apps/backend/src/modules/catalog/domain/value-objects/sku.value-object.ts
export class Sku {
  private constructor(private readonly value: string) {}

  public static create(value: string): Sku {
    const skuRegex = /^[A-Z]{3}-[A-Z]{3}-\d{4}$/; // Format: VND-PRD-1234
    if (!skuRegex.test(value)) {
      throw new Error('Invalid SKU format structure.');
    }
    return new Sku(value);
  }

  public getRawValue(): string {
    return this.value;
  }
}

// apps/backend/src/modules/catalog/domain/aggregates/product.aggregate.ts
import { Sku } from '../value-objects/sku.value-object';

export class ProductAggregate {
  private constructor(
    private readonly id: string,
    private sku: Sku,
    private name: string,
    private isAvailable: boolean,
    private readonly domainEvents: any[] = []
  ) {}

  public static create(id: string, rawSku: string, name: string): ProductAggregate {
    if (!name || name.trim().length < 3) {
      throw new Error('Product name must contain at least 3 characters.');
    }
    
    const product = new ProductAggregate(id, Sku.create(rawSku), name, true);
    
    product.domainEvents.push({
      eventName: 'ProductCreated',
      payload: { productId: id, sku: rawSku },
      occurredAt: new Date(),
    });

    return product;
  }

  public getUncommittedEvents(): any[] {
    return [...this.domainEvents];
  }

  public clearEvents(): void {
    this.domainEvents.length = 0;
  }

  public getSku(): string { return this.sku.getRawValue(); }
  public getName(): string { return this.name; }
}
