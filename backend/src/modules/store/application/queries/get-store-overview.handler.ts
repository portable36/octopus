import { Inject, Injectable } from '@nestjs/common';
import type { Store } from '../../domain/aggregates/store.aggregate';
import { StoreAccessDeniedError, StoreNotFoundError } from '../errors/store.errors';
import {
  STORE_PROVISIONING_REPOSITORY,
  type StoreProvisioningRepository,
} from '../ports/store-provisioning-repository.interface';
import { STORE_REPOSITORY, type StoreRepository } from '../ports/store-repository.interface';
import { StoreHealthService, type StoreHealthReport } from '../services/store-health.service';

export type StoreOverviewResult = {
  readonly store: Store;
  readonly health: StoreHealthReport;
  readonly provisioning: {
    readonly runId: string;
    readonly status: string;
    readonly lastError: string | null;
    readonly startedAt: Date;
    readonly completedAt: Date | null;
  } | null;
  readonly metrics: {
    readonly orders: { readonly available: false; readonly reason: string };
    readonly revenue: { readonly available: false; readonly reason: string };
  };
};

@Injectable()
export class GetStoreOverviewHandler {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(STORE_PROVISIONING_REPOSITORY)
    private readonly provisioning: StoreProvisioningRepository,
    private readonly health: StoreHealthService,
  ) {}

  public async execute(
    storeId: string,
    actorRoles: readonly string[],
  ): Promise<StoreOverviewResult> {
    if (!actorRoles.includes('PLATFORM_ADMIN')) {
      throw new StoreAccessDeniedError();
    }

    const store = await this.stores.findById(storeId);
    if (!store) {
      throw new StoreNotFoundError();
    }

    const [health, latestRun] = await Promise.all([
      this.health.evaluate(storeId, store.status),
      store.status === 'provisioning' || store.status === 'failed'
        ? this.provisioning.findLatestRunByStoreId(storeId)
        : Promise.resolve(null),
    ]);

    return {
      store,
      health,
      provisioning: latestRun
        ? {
            runId: latestRun.id,
            status: latestRun.status,
            lastError: latestRun.lastError,
            startedAt: latestRun.startedAt,
            completedAt: latestRun.completedAt,
          }
        : null,
      metrics: {
        orders: {
          available: false,
          reason: 'Order metrics deferred until reporting projections exist.',
        },
        revenue: {
          available: false,
          reason: 'Revenue metrics deferred until reporting projections exist.',
        },
      },
    };
  }

  public async healthOnly(
    storeId: string,
    actorRoles: readonly string[],
  ): Promise<StoreHealthReport> {
    if (!actorRoles.includes('PLATFORM_ADMIN')) {
      throw new StoreAccessDeniedError();
    }
    const store = await this.stores.findById(storeId);
    if (!store) {
      throw new StoreNotFoundError();
    }
    return this.health.evaluate(storeId, store.status);
  }
}
