import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type {
  ProvisioningStepName,
  ProvisioningStepStatus,
} from '../../domain/store-onboarding.types';

@Entity({ tableName: 'store_provisioning_steps' })
@Unique({ properties: ['runId', 'stepName'] })
export class StoreProvisioningStepOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'run_id', type: 'uuid' })
  runId!: string;

  @Property({ fieldName: 'step_name' })
  stepName!: ProvisioningStepName;

  @Property({ default: 'pending' })
  status!: ProvisioningStepStatus;

  @Property({ fieldName: 'started_at', nullable: true })
  startedAt: Date | null = null;

  @Property({ fieldName: 'completed_at', nullable: true })
  completedAt: Date | null = null;

  @Property({ type: 'text', nullable: true })
  error: string | null = null;

  @Property({ fieldName: 'retry_count', type: 'integer', default: 0 })
  retryCount = 0;
}
