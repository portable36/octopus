import { describe, expect, it, vi } from 'vitest';
import { RegisterHandler } from './register.handler';
import { Register } from '../../domain/aggregates/register.aggregate';
import {
  PosAccessDeniedError,
  RegisterCodeAlreadyExistsError,
  RegisterNotFoundError,
} from '../errors/pos.errors';

describe('RegisterHandler', () => {
  const storeId = '0191c0a0-0000-7000-8000-000000000001';
  const vendorId = '0191c0a0-0000-7000-8000-000000000002';
  const sampleStore = {
    storeId,
    vendorId,
    displayName: 'Test Store',
    slug: 'test-store',
    description: null,
    locale: 'en-BD',
    currencyCode: 'BDT',
    acceptsOnlineOrders: true,
    addressLine1: null,
    city: null,
    region: null,
    managerUserIds: ['mgr-1'],
    staffUserIds: ['mgr-1', 'staff-1'],
    status: 'active',
    codEnabled: false,
    codMinAmountMinor: 0,
    codMaxAmountMinor: null,
    codReservationTtlHours: 72,
  };

  it('creates a new register when caller is authorized and code is unique', async () => {
    const auth = {
      requireRegisterManager: vi.fn().mockResolvedValue(sampleStore),
      requireRegisterViewer: vi.fn(),
    };
    const registers = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByStoreId: vi.fn(),
      findByStoreAndCode: vi.fn().mockResolvedValue(null),
    };
    const handler = new RegisterHandler(registers as never, auth as never);

    const result = await handler.createRegister({
      storeId,
      actorUserId: 'mgr-1',
      actorRoles: ['STORE_MANAGER'],
      code: 'REG-01',
      name: 'Main Counter',
      notes: 'Counter near entrance',
    });

    expect(auth.requireRegisterManager).toHaveBeenCalledWith(storeId, 'mgr-1', ['STORE_MANAGER']);
    expect(registers.findByStoreAndCode).toHaveBeenCalledWith(storeId, 'REG-01');
    expect(registers.save).toHaveBeenCalledOnce();
    expect(result.code).toBe('REG-01');
    expect(result.name).toBe('Main Counter');
    expect(result.status).toBe('ACTIVE');
  });

  it('rejects creation when code already exists for the store', async () => {
    const auth = {
      requireRegisterManager: vi.fn().mockResolvedValue(sampleStore),
      requireRegisterViewer: vi.fn(),
    };
    const existing = Register.create({
      storeId,
      vendorId,
      code: 'REG-01',
      name: 'Existing Counter',
    });
    const registers = {
      save: vi.fn(),
      findById: vi.fn(),
      findByStoreId: vi.fn(),
      findByStoreAndCode: vi.fn().mockResolvedValue(existing),
    };
    const handler = new RegisterHandler(registers as never, auth as never);

    await expect(
      handler.createRegister({
        storeId,
        actorUserId: 'mgr-1',
        actorRoles: ['STORE_MANAGER'],
        code: 'reg-01',
        name: 'Duplicate Counter',
      }),
    ).rejects.toBeInstanceOf(RegisterCodeAlreadyExistsError);

    expect(registers.save).not.toHaveBeenCalled();
  });

  it('rejects creation when caller is unauthorized', async () => {
    const auth = {
      requireRegisterManager: vi.fn().mockRejectedValue(new PosAccessDeniedError()),
      requireRegisterViewer: vi.fn(),
    };
    const registers = {
      save: vi.fn(),
      findById: vi.fn(),
      findByStoreId: vi.fn(),
      findByStoreAndCode: vi.fn(),
    };
    const handler = new RegisterHandler(registers as never, auth as never);

    await expect(
      handler.createRegister({
        storeId,
        actorUserId: 'staff-1',
        actorRoles: ['STORE_STAFF'],
        code: 'REG-02',
        name: 'Second Counter',
      }),
    ).rejects.toBeInstanceOf(PosAccessDeniedError);
  });

  it('lists registers for store viewers', async () => {
    const auth = {
      requireRegisterManager: vi.fn(),
      requireRegisterViewer: vi.fn().mockResolvedValue(sampleStore),
    };
    const reg1 = Register.create({ storeId, vendorId, code: 'REG-01', name: 'Counter 1' });
    const reg2 = Register.create({ storeId, vendorId, code: 'REG-02', name: 'Counter 2' });
    const registers = {
      save: vi.fn(),
      findById: vi.fn(),
      findByStoreId: vi.fn().mockResolvedValue([reg1, reg2]),
      findByStoreAndCode: vi.fn(),
    };
    const handler = new RegisterHandler(registers as never, auth as never);

    const list = await handler.listRegisters(storeId, 'staff-1', ['STORE_STAFF']);

    expect(auth.requireRegisterViewer).toHaveBeenCalledWith(storeId, 'staff-1', ['STORE_STAFF']);
    expect(list).toHaveLength(2);
    expect(list[0]?.code).toBe('REG-01');
    expect(list[1]?.code).toBe('REG-02');
  });

  it('updates register name, notes, and status', async () => {
    const auth = {
      requireRegisterManager: vi.fn().mockResolvedValue(sampleStore),
      requireRegisterViewer: vi.fn(),
    };
    const reg = Register.create({ storeId, vendorId, code: 'REG-01', name: 'Counter 1' });
    const registers = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(reg),
      findByStoreId: vi.fn(),
      findByStoreAndCode: vi.fn(),
    };
    const handler = new RegisterHandler(registers as never, auth as never);

    const updated = await handler.updateRegister({
      storeId,
      registerId: reg.id.value,
      actorUserId: 'mgr-1',
      actorRoles: ['STORE_MANAGER'],
      name: 'Renamed Counter',
      status: 'INACTIVE',
      notes: 'New notes',
    });

    expect(updated.name).toBe('Renamed Counter');
    expect(updated.status).toBe('INACTIVE');
    expect(updated.notes).toBe('New notes');
    expect(registers.save).toHaveBeenCalledWith(reg);
  });

  it('throws RegisterNotFoundError when updating non-existent register', async () => {
    const auth = {
      requireRegisterManager: vi.fn().mockResolvedValue(sampleStore),
      requireRegisterViewer: vi.fn(),
    };
    const registers = {
      save: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      findByStoreId: vi.fn(),
      findByStoreAndCode: vi.fn(),
    };
    const handler = new RegisterHandler(registers as never, auth as never);

    await expect(
      handler.updateRegister({
        storeId,
        registerId: 'missing-reg',
        actorUserId: 'mgr-1',
        actorRoles: ['STORE_MANAGER'],
        name: 'New Name',
      }),
    ).rejects.toBeInstanceOf(RegisterNotFoundError);
  });
});
