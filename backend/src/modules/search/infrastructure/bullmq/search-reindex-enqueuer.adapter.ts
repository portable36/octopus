import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, type ConnectionOptions, type JobsOptions } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { AppConfigService } from '../../../../config/app-config.service';
import type {
  SearchReindexEnqueueResult,
  SearchReindexEnqueuerPort,
} from '../../application/ports/search-reindex-enqueuer.port';

/** Must match messaging QUEUE_NAMES.searchIndexing — keep string literal to avoid cross-module import. */
export const SEARCH_INDEXING_QUEUE = 'octopus.search-indexing';

const JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: 1_000,
  removeOnFail: 5_000,
};

/**
 * Enqueues SearchReindexBatch jobs onto the shared indexing queue.
 * Does not call Meilisearch inline (Phase 16.3).
 */
@Injectable()
export class SearchReindexEnqueuerAdapter implements SearchReindexEnqueuerPort, OnModuleDestroy {
  private readonly logger = new Logger(SearchReindexEnqueuerAdapter.name);
  private queue: Queue | null = null;
  private readonly connection: ConnectionOptions;

  constructor(private readonly config: AppConfigService) {
    this.connection = {
      url: this.config.redisUrl,
      maxRetriesPerRequest: null,
    };
  }

  public async enqueueOfferBatches(
    batches: readonly (readonly string[])[],
  ): Promise<SearchReindexEnqueueResult> {
    if (this.config.isTest || !this.config.outboxDispatchEnabled) {
      this.logger.warn('Search reindex enqueue skipped (test or OUTBOX_DISPATCH_ENABLED=false).');
      return { batches: 0, offerIds: 0 };
    }

    const queue = this.ensureQueue();
    let offerIds = 0;
    let batchCount = 0;
    for (const offerIdBatch of batches) {
      if (offerIdBatch.length === 0) {
        continue;
      }
      const outboxId = randomUUID();
      await queue.add(
        'SearchReindexBatch',
        {
          outboxId,
          source: 'catalog',
          aggregateId: offerIdBatch[0],
          eventType: 'SearchReindexBatch',
          payload: { offerIds: [...offerIdBatch] },
          eventVersion: 1,
        },
        { ...JOB_OPTIONS, jobId: `reindex-${outboxId}` },
      );
      offerIds += offerIdBatch.length;
      batchCount += 1;
    }
    return { batches: batchCount, offerIds };
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }

  private ensureQueue(): Queue {
    if (!this.queue) {
      this.queue = new Queue(SEARCH_INDEXING_QUEUE, { connection: this.connection });
    }
    return this.queue;
  }
}
