import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import type {
  ProductAssociationRecord,
  ProductAssociationRepository,
} from '../../application/ports/product-association-repository.interface';
import { ProductAssociation } from '../entities/product-association.entity';

@Injectable()
export class ProductAssociationRepositoryAdapter implements ProductAssociationRepository {
  constructor(private readonly em: EntityManager) {}

  public async replaceAll(associations: readonly ProductAssociationRecord[]): Promise<void> {
    await this.em.transactional(async (tx) => {
      await tx.nativeDelete(ProductAssociation, {});
      const now = new Date();
      for (const row of associations) {
        const entity = new ProductAssociation();
        entity.id = randomUUID();
        entity.productId = row.productId;
        entity.associatedProductId = row.associatedProductId;
        entity.coPurchaseScore = row.coPurchaseScore;
        entity.updatedAt = now;
        tx.persist(entity);
      }
      await tx.flush();
    });
  }

  public async findTopByProductId(
    productId: string,
    limit: number,
  ): Promise<readonly ProductAssociationRecord[]> {
    const rows = await this.em.find(
      ProductAssociation,
      { productId },
      {
        orderBy: { coPurchaseScore: 'DESC', associatedProductId: 'ASC' },
        limit,
      },
    );

    return rows.map((row) => ({
      productId: row.productId,
      associatedProductId: row.associatedProductId,
      coPurchaseScore: row.coPurchaseScore,
    }));
  }
}
