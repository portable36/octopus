import type { StoreOnboardingDraftRecord } from '../../domain/store-onboarding.types';

export const STORE_ONBOARDING_DRAFT_REPOSITORY = Symbol('STORE_ONBOARDING_DRAFT_REPOSITORY');

export interface StoreOnboardingDraftRepository {
  save(draft: StoreOnboardingDraftRecord): Promise<void>;
  findById(id: string): Promise<StoreOnboardingDraftRecord | null>;
  findByStoreId(storeId: string): Promise<StoreOnboardingDraftRecord | null>;
}
