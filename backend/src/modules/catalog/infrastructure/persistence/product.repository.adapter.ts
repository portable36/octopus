import { Injectable, Logger } from '@nestjs/common';
import type { ProductRepository } from '../../application/ports/product-repository.interface';
import { Product } from '../../domain/aggregates/product.aggregate';

@Injectable()
export class ProductRepositoryAdapter implements ProductRepository {
  private readonly logger = new Logger(ProductRepositoryAdapter.name);

  async save(product: Product): Promise<void> {
    this.logger.debug(`Persisting product ${product.sku}`);
  }

  async findById(_id: string): Promise<Product | null> {
    return null;
  }
}
