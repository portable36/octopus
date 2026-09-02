import { describe, expect, it, vi } from 'vitest';
import type { Job } from 'bullmq';
import type { OrderProductBasket } from '../application/ports/completed-order-baskets.port';
import type { ProductAssociationRecord } from '../application/ports/product-association-repository.interface';
import { CoPurchaseAnalyzerService } from '../application/services/co-purchase-analyzer.service';
import { PurchasePatternAnalysisService } from '../application/services/purchase-pattern-analysis.service';
import { AI_PERSONALIZATION_JOB_NAMES } from '../jobs/ai-personalization.constants';
import type { AiPersonalizationJobPayload } from '../jobs/ai-personalization-job.types';
import { AiPersonalizationWorker } from '../jobs/ai-personalization.worker';

describe('CoPurchaseAnalyzerService', () => {
  const analyzer = new CoPurchaseAnalyzerService();

  it('computes directional confidence scores from order baskets', () => {
    const baskets: OrderProductBasket[] = [
      { orderId: 'o1', productIds: ['a', 'b'] },
      { orderId: 'o2', productIds: ['a', 'b'] },
      { orderId: 'o3', productIds: ['a', 'c'] },
    ];

    const associations = analyzer.computeAssociations(baskets);

    expect(associations).toContainEqual({
      productId: 'a',
      associatedProductId: 'b',
      coPurchaseScore: Number((2 / 3).toFixed(6)),
    });
    expect(associations).toContainEqual({
      productId: 'a',
      associatedProductId: 'c',
      coPurchaseScore: Number((1 / 3).toFixed(6)),
    });
    expect(associations).toContainEqual({
      productId: 'b',
      associatedProductId: 'a',
      coPurchaseScore: 1,
    });
  });

  it('deduplicates repeated line items within the same order', () => {
    const associations = analyzer.computeAssociations([
      { orderId: 'o1', productIds: ['a', 'a', 'b'] },
    ]);

    expect(associations).toEqual([
      { productId: 'a', associatedProductId: 'b', coPurchaseScore: 1 },
      { productId: 'b', associatedProductId: 'a', coPurchaseScore: 1 },
    ]);
  });
});

describe('PurchasePatternAnalysisService', () => {
  it('aggregates baskets and persists the association matrix', async () => {
    const baskets: OrderProductBasket[] = [
      { orderId: 'o1', productIds: ['p1', 'p2'] },
      { orderId: 'o2', productIds: ['p1', 'p2'] },
    ];
    const persisted: ProductAssociationRecord[] = [];

    const orderBaskets = {
      listRecentBaskets: vi.fn(async () => baskets),
    };
    const associations = {
      replaceAll: vi.fn(async (rows: readonly ProductAssociationRecord[]) => {
        persisted.push(...rows);
      }),
      findTopByProductId: vi.fn(),
    };

    const service = new PurchasePatternAnalysisService(
      orderBaskets,
      associations,
      new CoPurchaseAnalyzerService(),
    );

    const result = await service.analyzeAndPersist();

    expect(orderBaskets.listRecentBaskets).toHaveBeenCalledOnce();
    expect(associations.replaceAll).toHaveBeenCalledOnce();
    expect(result.associationsWritten).toBe(2);
    expect(persisted).toContainEqual({
      productId: 'p1',
      associatedProductId: 'p2',
      coPurchaseScore: 1,
    });
    expect(persisted).toContainEqual({
      productId: 'p2',
      associatedProductId: 'p1',
      coPurchaseScore: 1,
    });
  });
});

describe('AiPersonalizationWorker', () => {
  it('runs analyze-purchase-patterns job through the analysis service', async () => {
    const analyzeAndPersist = vi.fn(async () => ({ associationsWritten: 4 }));
    const worker = new AiPersonalizationWorker(
      { redisUrl: 'redis://localhost:6379', bullmqConcurrencyDefault: 1, bullmqJobTimeoutMs: 30_000, aiPersonalizationWorkerEnabled: false, isTest: true } as never,
      {} as never,
      { analyzeAndPersist } as never,
      { processAbandonedCart: vi.fn() } as never,
    );

    const job = {
      name: AI_PERSONALIZATION_JOB_NAMES.analyzePurchasePatterns,
      data: {
        jobName: AI_PERSONALIZATION_JOB_NAMES.analyzePurchasePatterns,
        requestedAt: new Date().toISOString(),
      },
    } as Job<AiPersonalizationJobPayload>;

    await worker.process(job);

    expect(analyzeAndPersist).toHaveBeenCalledOnce();
  });
});
