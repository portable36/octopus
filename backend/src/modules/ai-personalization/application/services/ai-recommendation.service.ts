import { Inject, Injectable } from '@nestjs/common';
import {
  PRODUCT_ASSOCIATION_REPOSITORY,
  type ProductAssociationRecord,
  type ProductAssociationRepository,
} from '../ports/product-association-repository.interface';

export type ProductRecommendation = {
  readonly productId: string;
  readonly coPurchaseScore: number;
};

@Injectable()
export class AiRecommendationService {
  constructor(
    @Inject(PRODUCT_ASSOCIATION_REPOSITORY)
    private readonly associations: ProductAssociationRepository,
  ) {}

  public async getFrequentlyBoughtTogether(
    productId: string,
    limit = 8,
  ): Promise<readonly ProductRecommendation[]> {
    const capped = Math.min(Math.max(limit, 1), 24);
    const rows = await this.associations.findTopByProductId(productId, capped);
    return rows.map(toRecommendation);
  }
}

function toRecommendation(row: ProductAssociationRecord): ProductRecommendation {
  return {
    productId: row.associatedProductId,
    coPurchaseScore: row.coPurchaseScore,
  };
}
