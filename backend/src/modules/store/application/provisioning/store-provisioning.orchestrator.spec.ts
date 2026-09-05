import { describe, expect, it, vi } from 'vitest';
import { Store } from '../../domain/aggregates/store.aggregate';
import { StoreProvisioningOrchestrator } from './store-provisioning.orchestrator';

const VENDOR = '01900000-0000-7000-8000-000000000001';
const MANAGER = '01900000-0000-7000-8000-000000000010';
const ACTOR = '01900000-0000-7000-8000-000000000099';

describe('StoreProvisioningOrchestrator', () => {
  it('runs idempotent steps and completes provisioning', async () => {
    const store = Store.create({
      vendorId: VENDOR,
      displayName: 'Provisioned Store',
      managerUserId: MANAGER,
    });
    store.startProvisioning(ACTOR);

    const save = vi.fn();
    const markStepStatus = vi.fn().mockImplementation(async (runId, stepName, status) => ({
      id: 'step-id',
      runId,
      stepName,
      status,
      startedAt: new Date(),
      completedAt: status === 'completed' ? new Date() : null,
      error: null,
      retryCount: 0,
    }));
    const findStep = vi.fn().mockResolvedValue(null);
    const findLatestRunByStoreId = vi.fn().mockResolvedValue({
      id: 'run-1',
      storeId: store.id.value,
      status: 'running',
      startedAt: new Date(),
      completedAt: null,
      lastError: null,
    });
    const updateRun = vi.fn();

    const orchestrator = new StoreProvisioningOrchestrator(
      {
        findById: vi.fn().mockResolvedValue(store),
        save,
      } as never,
      {
        findStep,
        markStepStatus,
        findLatestRunByStoreId,
        updateRun,
        existsHostname: vi.fn().mockResolvedValue(false),
        saveDomain: vi.fn(),
      } as never,
      {
        provision: vi.fn().mockResolvedValue({ success: true }),
      },
      {
        provision: vi.fn().mockResolvedValue({ success: true }),
      },
      {
        provision: vi.fn().mockResolvedValue({ success: true }),
      },
    );

    await orchestrator.execute({
      storeId: store.id.value,
      runId: 'run-1',
      vendorId: VENDOR,
      actorUserId: ACTOR,
      payload: {
        basic: { displayName: 'Provisioned Store', storeCode: 'PROV-001' },
        type: { storeType: 'online' },
        owner: { ownershipKind: 'vendor_owned' },
      },
    });

    expect(markStepStatus).toHaveBeenCalled();
    expect(updateRun).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(store.status).toBe('active');
    expect(save).toHaveBeenCalled();
  });

  it('skips completed steps on retry', async () => {
    const store = Store.create({
      vendorId: VENDOR,
      displayName: 'Retry Store',
      managerUserId: MANAGER,
    });
    store.startProvisioning(ACTOR);

    const findStep = vi.fn().mockImplementation(async (_runId: string, stepName: string) =>
      stepName === 'StoreIdentityFinalized'
        ? {
            id: 's1',
            runId: 'run-1',
            stepName: 'StoreIdentityFinalized',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            error: null,
            retryCount: 0,
          }
        : null,
    );

    const markStepStatus = vi.fn().mockImplementation(async (runId, stepName, status) => ({
      id: 'step-id',
      runId,
      stepName,
      status,
      startedAt: new Date(),
      completedAt: status === 'completed' ? new Date() : null,
      error: null,
      retryCount: 0,
    }));

    const orchestrator = new StoreProvisioningOrchestrator(
      {
        findById: vi.fn().mockResolvedValue(store),
        save: vi.fn(),
      } as never,
      {
        findStep,
        markStepStatus,
        findLatestRunByStoreId: vi.fn().mockResolvedValue({
          id: 'run-1',
          storeId: store.id.value,
          status: 'running',
          startedAt: new Date(),
          completedAt: null,
          lastError: null,
        }),
        updateRun: vi.fn(),
        existsHostname: vi.fn().mockResolvedValue(false),
        saveDomain: vi.fn(),
      } as never,
      { provision: vi.fn().mockResolvedValue({ success: true }) },
      { provision: vi.fn().mockResolvedValue({ success: true }) },
      { provision: vi.fn().mockResolvedValue({ success: true }) },
    );

    await orchestrator.execute({
      storeId: store.id.value,
      runId: 'run-1',
      vendorId: VENDOR,
      actorUserId: ACTOR,
      payload: {},
    });

    const completedCalls = markStepStatus.mock.calls.filter(
      (call) => call[1] === 'StoreIdentityFinalized',
    );
    expect(completedCalls).toHaveLength(0);
  });
});
