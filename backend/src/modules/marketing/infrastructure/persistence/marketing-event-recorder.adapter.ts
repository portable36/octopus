import { Injectable } from '@nestjs/common';
import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  createRequestContext,
  runWithTenantContext,
  setPlatformScope,
} from '../../../../shared-kernel/infrastructure/context/tenant-context.storage';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { MarketingEventRecorder } from '../../application/ports/marketing-event-recorder.port';
import { MarketingEventOrmEntity } from './marketing-event.orm-entity';

@Injectable()
export class MarketingEventRecorderAdapter implements MarketingEventRecorder {
  constructor(private readonly em: EntityManager) {}

  public async record(input: {
    readonly eventName: string;
    readonly channel: 'ga4_mp' | 'meta_capi' | 'audit';
    readonly transactionId: string;
    readonly eventId: string;
    readonly orderId: string | null;
    readonly status: 'SENT' | 'SKIPPED' | 'FAILED';
    readonly detail: string | null;
  }): Promise<void> {
    await this.withPlatformScope(async () => {
      try {
        await withRlsContext(this.em, async (tx) => {
          const row = new MarketingEventOrmEntity();
          row.id = UniqueID.create().value;
          row.eventName = input.eventName;
          row.channel = input.channel;
          row.transactionId = input.transactionId;
          row.eventId = input.eventId;
          row.orderId = input.orderId;
          row.status = input.status;
          row.detail = input.detail;
          row.createdAt = new Date();
          await tx.persist(row).flush();
        });
      } catch (error) {
        if (error instanceof UniqueConstraintViolationException) {
          return;
        }
        throw error;
      }
    });
  }

  private async withPlatformScope<T>(work: () => Promise<T>): Promise<T> {
    return runWithTenantContext(createRequestContext(`marketing-${Date.now()}`), async () => {
      setPlatformScope(true);
      return work();
    });
  }
}
