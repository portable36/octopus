import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import type { ProvisioningRunStatus } from '../../domain/store-onboarding.types';

@Entity({ tableName: 'store_provisioning_runs' })
export class StoreProvisioningRunOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ default: 'running' })
  status!: ProvisioningRunStatus;

  @Property({ fieldName: 'started_at' })
  startedAt!: Date;

  @Property({ fieldName: 'completed_at', nullable: true })
  completedAt: Date | null = null;

  @Property({ fieldName: 'last_error', type: 'text', nullable: true })
  lastError: string | null = null;
}
