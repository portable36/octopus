import { Injectable } from '@nestjs/common';
import type { OrderProductBasket } from '../ports/completed-order-baskets.port';
import type { ProductAssociationRecord } from '../ports/product-association-repository.interface';

@Injectable()
export class CoPurchaseAnalyzerService {
  /**
   * Confidence score P(B|A): how often B appears in orders that also contain A.
   */
  public computeAssociations(baskets: readonly OrderProductBasket[]): ProductAssociationRecord[] {
    const orderCountByProduct = new Map<string, number>();
    const pairCount = new Map<string, number>();

    for (const basket of baskets) {
      const uniqueProducts = [...new Set(basket.productIds)].filter((id) => id.length > 0);
      if (uniqueProducts.length < 2) {
        continue;
      }

      for (const productId of uniqueProducts) {
        orderCountByProduct.set(productId, (orderCountByProduct.get(productId) ?? 0) + 1);
      }

      for (const productId of uniqueProducts) {
        for (const associatedProductId of uniqueProducts) {
          if (productId === associatedProductId) {
            continue;
          }
          const key = `${productId}\0${associatedProductId}`;
          pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
        }
      }
    }

    const associations: ProductAssociationRecord[] = [];
    for (const [key, count] of pairCount) {
      const separator = key.indexOf('\0');
      const productId = key.slice(0, separator);
      const associatedProductId = key.slice(separator + 1);
      const denominator = orderCountByProduct.get(productId) ?? 0;
      if (denominator === 0) {
        continue;
      }
      associations.push({
        productId,
        associatedProductId,
        coPurchaseScore: Number((count / denominator).toFixed(6)),
      });
    }

    return associations;
  }
}
