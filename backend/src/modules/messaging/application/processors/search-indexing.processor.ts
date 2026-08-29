import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import {
  CATALOG_OFFER_SEARCH_SOURCE,
  type CatalogOfferSearchSourceDto,
  type CatalogOfferSearchSourcePort,
} from '../../../../shared-kernel/application/ports/catalog-offer-search-source.port';
import {
  INVENTORY_PORT,
  type InventoryPort,
} from '../../../../shared-kernel/application/ports/inventory.port';
import {
  PRODUCT_SEARCH_INDEX,
  type ProductSearchIndexPort,
} from '../../../../shared-kernel/application/ports/product-search-index.port';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import type { OutboxJobPayload } from '../../domain/outbox.types';
import { runOutboxDelivery } from '../outbox-delivery';

/**
 * Idempotent search indexer for octopus.search-indexing.
 * Uses shared-kernel ports only (no Catalog/Search ORM imports).
 */
@Injectable()
export class SearchIndexingProcessor {
  private readonly logger = new Logger(SearchIndexingProcessor.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(PRODUCT_SEARCH_INDEX) private readonly index: ProductSearchIndexPort,
    @Inject(CATALOG_OFFER_SEARCH_SOURCE) private readonly catalog: CatalogOfferSearchSourcePort,
    @Inject(INVENTORY_PORT) private readonly inventory: InventoryPort,
  ) {}

  public async handle(job: OutboxJobPayload): Promise<void> {
    const processed = await runOutboxDelivery(this.redis, job.outboxId, async () => {
      const offerIds = await this.resolveOfferIds(job);
      if (offerIds.length === 0) {
        return;
      }

      const sources = await this.catalog.loadOfferSources(offerIds);
      const byId = new Map(sources.map((source) => [source.offerId, source] as const));

      for (const offerId of offerIds) {
        const source = byId.get(offerId);
        if (!source) {
          await this.index.deleteByOfferId(offerId);
          continue;
        }
        await this.indexOfferSource(source);
      }
    });
    if (!processed) {
      this.logger.debug(`Skipping duplicate search job ${job.outboxId} (${job.eventType})`);
    }
  }

  private async resolveOfferIds(job: OutboxJobPayload): Promise<readonly string[]> {
    const { eventType, payload, aggregateId } = job;

    if (eventType === 'SearchReindexBatch') {
      const raw = payload['offerIds'];
      if (!Array.isArray(raw)) {
        return [];
      }
      return raw.map((id) => String(id)).filter((id) => id.length > 0);
    }
    if (eventType.startsWith('StoreOffer')) {
      const offerId = String(payload['offerId'] ?? aggregateId);
      return offerId ? [offerId] : [];
    }
    if (eventType.startsWith('Product') && !eventType.startsWith('ProductVariant')) {
      const productId = String(payload['productId'] ?? aggregateId);
      return productId ? this.catalog.listOfferIdsByProductId(productId) : [];
    }
    if (eventType.startsWith('ProductVariant')) {
      const variantId = String(payload['variantId'] ?? aggregateId);
      return variantId ? this.catalog.listOfferIdsByVariantId(variantId) : [];
    }
    if (eventType.startsWith('Inventory')) {
      const variantId = String(payload['variantId'] ?? '');
      const storeId = payload['storeId'] != null ? String(payload['storeId']) : null;
      if (!variantId) {
        return [];
      }
      if (storeId) {
        return this.catalog.listOfferIdsByStoreAndVariant(storeId, variantId);
      }
      return this.catalog.listOfferIdsByVariantId(variantId);
    }
    return [];
  }

  private async indexOfferSource(source: CatalogOfferSearchSourceDto): Promise<void> {
    let stockAvailable: number | null = null;
    try {
      const availability = await this.inventory.checkStoreAvailability({
        storeId: source.storeId,
        variantId: source.variantId,
      });
      stockAvailable = availability.status === 'MISSING' ? null : availability.available;
    } catch (error) {
      this.logger.warn(
        `Inventory lookup failed for offer ${source.offerId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const result = await this.index.indexOfferSource(source, stockAvailable);
    this.logger.debug(`Indexed offer ${source.offerId} → ${result}`);
  }
}
