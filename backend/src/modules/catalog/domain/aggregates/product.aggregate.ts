import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { Sku } from '../value-objects/sku.value-object';

interface ProductProps {
  sku: Sku;
  name: string;
  isAvailable: boolean;
}

const MIN_NAME_LENGTH = 3;

export class Product extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: ProductProps,
  ) {
    super(id);
  }

  public static create(rawSku: string, name: string): Product {
    const trimmed = name.trim();
    if (trimmed.length < MIN_NAME_LENGTH) {
      throw new Error('Product name must contain at least 3 characters.');
    }
    const product = new Product(UniqueID.create(), {
      sku: Sku.create(rawSku),
      name: trimmed,
      isAvailable: true,
    });
    product.addEvent('ProductCreated', {
      productId: product.id.value,
      sku: product.sku,
    });
    return product;
  }

  public static rehydrate(id: string, rawSku: string, name: string, isAvailable: boolean): Product {
    return new Product(UniqueID.from(id), {
      sku: Sku.create(rawSku),
      name,
      isAvailable,
    });
  }

  get sku(): string {
    return this.props.sku.getRawValue();
  }

  get name(): string {
    return this.props.name;
  }

  get isAvailable(): boolean {
    return this.props.isAvailable;
  }

  public markUnavailable(): void {
    this.props = { ...this.props, isAvailable: false };
    this.addEvent('ProductMarkedUnavailable', { productId: this.id.value });
  }

  public rename(name: string): void {
    const trimmed = name.trim();
    if (trimmed.length < MIN_NAME_LENGTH) {
      throw new Error('Product name must contain at least 3 characters.');
    }
    this.props = { ...this.props, name: trimmed };
    this.addEvent('ProductRenamed', { productId: this.id.value, name: trimmed });
  }
}
