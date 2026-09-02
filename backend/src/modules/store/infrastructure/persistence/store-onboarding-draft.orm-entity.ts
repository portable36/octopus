import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import type {
  StoreOnboardingDraftStatus,
  StoreWizardPayload,
  StoreWizardStep,
} from '../../domain/store-onboarding.types';

@Entity({ tableName: 'store_onboarding_drafts' })
export class StoreOnboardingDraftOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'actor_user_id', type: 'uuid' })
  actorUserId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid', nullable: true })
  storeId: string | null = null;

  @Property({ fieldName: 'current_step', type: 'integer', default: 1 })
  currentStep!: StoreWizardStep;

  @Property({ type: 'json', default: '{}' })
  payload: StoreWizardPayload = {};

  @Property({ default: 'editing' })
  status!: StoreOnboardingDraftStatus;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
