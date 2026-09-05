import type {
  ProvisioningRunRecord,
  ProvisioningStepName,
  ProvisioningStepRecord,
  ProvisioningStepStatus,
} from '../../domain/store-onboarding.types';

export const STORE_PROVISIONING_REPOSITORY = Symbol('STORE_PROVISIONING_REPOSITORY');

export interface StoreDomainRecord {
  readonly id: string;
  readonly storeId: string;
  readonly hostname: string;
  readonly kind: string;
  readonly isPrimary: boolean;
  readonly verificationStatus: string;
  readonly createdAt: Date;
}

export interface ProvisioningRunWithSteps {
  readonly run: ProvisioningRunRecord;
  readonly steps: readonly ProvisioningStepRecord[];
}

export interface StoreProvisioningRepository {
  createRun(storeId: string): Promise<ProvisioningRunRecord>;
  findLatestRunByStoreId(storeId: string): Promise<ProvisioningRunRecord | null>;
  findLatestRunWithStepsByStoreId(storeId: string): Promise<ProvisioningRunWithSteps | null>;
  updateRun(run: ProvisioningRunRecord): Promise<void>;
  findStep(runId: string, stepName: ProvisioningStepName): Promise<ProvisioningStepRecord | null>;
  saveStep(step: ProvisioningStepRecord): Promise<void>;
  markStepStatus(
    runId: string,
    stepName: ProvisioningStepName,
    status: ProvisioningStepStatus,
    patch?: {
      readonly error?: string | null;
      readonly startedAt?: Date;
      readonly completedAt?: Date;
    },
  ): Promise<ProvisioningStepRecord>;
  saveDomain(domain: StoreDomainRecord): Promise<void>;
  existsHostname(hostname: string): Promise<boolean>;
}
