import { describe, expect, it, vi } from 'vitest';
import {
  CreateStoreDraftHandler,
  UpdateStoreDraftHandler,
  ValidateStoreDraftHandler,
} from './store-onboarding.handlers';
import { StoreDraftValidationError } from '../errors/store.errors';
import type { StoreOnboardingDraftRecord } from '../../domain/store-onboarding.types';

const VENDOR_ID = '01900000-0000-7000-8000-000000000001';
const ACTOR = '01900000-0000-7000-8000-000000000010';

const vendor = {
  vendorId: VENDOR_ID,
  status: 'active',
  ownerUserId: ACTOR,
  staffUserIds: [ACTOR],
  currencyCode: 'BDT',
  codEnabled: false,
  codMinAmountMinor: 0,
  codMaxAmountMinor: null,
  codReservationTtlHours: 72,
};

describe('store onboarding handlers', () => {
  it('creates an editing draft for vendor staff', async () => {
    const save = vi.fn();
    const handler = new CreateStoreDraftHandler(
      { save, findById: vi.fn(), findByStoreId: vi.fn() },
      { findById: vi.fn().mockResolvedValue(vendor), findActivePublicById: vi.fn(), findActivePublicBySlug: vi.fn() },
    );

    const draft = await handler.execute({
      vendorId: VENDOR_ID,
      actorUserId: ACTOR,
      actorRoles: ['VENDOR_OWNER'],
    });

    expect(draft.status).toBe('editing');
    expect(draft.vendorId).toBe(VENDOR_ID);
    expect(save).toHaveBeenCalledOnce();
  });

  it('merges draft payload on update', async () => {
    const existing: StoreOnboardingDraftRecord = {
      id: '01900000-0000-7000-8000-000000000099',
      vendorId: VENDOR_ID,
      actorUserId: ACTOR,
      storeId: null,
      currentStep: 1,
      payload: { basic: { displayName: 'Old' } },
      status: 'editing',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const save = vi.fn();
    const handler = new UpdateStoreDraftHandler(
      {
        save,
        findById: vi.fn().mockResolvedValue(existing),
        findByStoreId: vi.fn(),
      },
      { findById: vi.fn().mockResolvedValue(vendor), findActivePublicById: vi.fn(), findActivePublicBySlug: vi.fn() },
    );

    const updated = await handler.execute({
      draftId: existing.id,
      actorUserId: ACTOR,
      actorRoles: ['VENDOR_OWNER'],
      currentStep: 2,
      payload: { basic: { storeCode: 'GUL-01' } },
    });

    expect(updated.currentStep).toBe(2);
    expect(updated.payload.basic?.displayName).toBe('Old');
    expect(updated.payload.basic?.storeCode).toBe('GUL-01');
    expect(save).toHaveBeenCalledOnce();
  });

  it('returns validation issues for incomplete draft', async () => {
    const draft: StoreOnboardingDraftRecord = {
      id: '01900000-0000-7000-8000-000000000099',
      vendorId: VENDOR_ID,
      actorUserId: ACTOR,
      storeId: null,
      currentStep: 16,
      payload: {},
      status: 'editing',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const handler = new ValidateStoreDraftHandler(
      {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(draft),
        findByStoreId: vi.fn(),
      },
      { findById: vi.fn().mockResolvedValue(vendor), findActivePublicById: vi.fn(), findActivePublicBySlug: vi.fn() },
      { existsHostname: vi.fn().mockResolvedValue(false) } as never,
    );

    const result = await handler.execute(draft.id, ACTOR, ['VENDOR_OWNER']);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('rejects update on submitted draft', async () => {
    const draft: StoreOnboardingDraftRecord = {
      id: '01900000-0000-7000-8000-000000000099',
      vendorId: VENDOR_ID,
      actorUserId: ACTOR,
      storeId: '01900000-0000-7000-8000-000000000050',
      currentStep: 17,
      payload: {},
      status: 'submitted',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const handler = new UpdateStoreDraftHandler(
      {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(draft),
        findByStoreId: vi.fn(),
      },
      { findById: vi.fn().mockResolvedValue(vendor), findActivePublicById: vi.fn(), findActivePublicBySlug: vi.fn() },
    );

    await expect(
      handler.execute({
        draftId: draft.id,
        actorUserId: ACTOR,
        actorRoles: ['VENDOR_OWNER'],
        payload: { basic: { displayName: 'X' } },
      }),
    ).rejects.toBeInstanceOf(StoreDraftValidationError);
  });
});
