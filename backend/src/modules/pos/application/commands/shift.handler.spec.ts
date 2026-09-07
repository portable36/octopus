import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Register } from '../../domain/aggregates/register.aggregate';
import { Shift } from '../../domain/aggregates/shift.aggregate';
import { ShiftHandler } from './shift.handler';
import { RegisterShiftAlreadyOpenError, ShiftCashierMismatchError } from '../errors/pos.errors';
import { ShiftRepository } from '../ports/shift-repository.interface';
import { RegisterRepository } from '../ports/register-repository.interface';
import { PosAuthorizationService } from '../services/pos-authorization.service';

describe('ShiftHandler & Multi-Register Cashier Balancing', () => {
  let shiftRepo: ShiftRepository;
  let registerRepo: RegisterRepository;
  let authService: PosAuthorizationService;
  let handler: ShiftHandler;

  const storeId = 'store-uuid-001';
  const vendorId = 'vendor-uuid-001';
  const cashierId = 'user-cashier-01';
  const managerId = 'user-manager-01';

  beforeEach(() => {
    const savedShifts = new Map<string, Shift>();

    shiftRepo = {
      save: vi.fn(async (s: Shift) => {
        savedShifts.set(s.id.value, s);
      }),
      findById: vi.fn(async (id: string) => savedShifts.get(id) ?? null),
      findActiveByRegisterId: vi.fn(async (regId: string) => {
        for (const s of savedShifts.values()) {
          if (s.registerId === regId && s.status === 'OPEN') return s;
        }
        return null;
      }),
      findLatestByRegisterId: vi.fn(async (regId: string) => {
        let latest: Shift | null = null;
        for (const s of savedShifts.values()) {
          if (s.registerId === regId) latest = s;
        }
        return latest;
      }),
      findByStoreId: vi.fn(async (sId: string) => {
        return Array.from(savedShifts.values()).filter((s) => s.storeId === sId);
      }),
      findActiveByStoreId: vi.fn(async (sId: string) => {
        return Array.from(savedShifts.values()).filter(
          (s) => s.storeId === sId && s.status === 'OPEN',
        );
      }),
    };

    const reg1 = Register.create({
      storeId,
      vendorId,
      code: 'REG-01',
      name: 'Counter 1',
    });
    const reg2 = Register.create({
      storeId,
      vendorId,
      code: 'REG-02',
      name: 'Counter 2',
    });

    registerRepo = {
      findById: vi.fn(async (id: string) => {
        if (id === reg1.id.value) return reg1;
        if (id === reg2.id.value) return reg2;
        return null;
      }),
      findByStoreId: vi.fn(async () => [reg1, reg2]),
    } as unknown as RegisterRepository;

    authService = {
      requireShiftOperator: vi.fn(async () => ({ storeId, vendorId })),
      isStoreManagerOrPlatformAdmin: vi.fn(async (_sId: string, actorId: string) => {
        return actorId === managerId;
      }),
    } as unknown as PosAuthorizationService;

    handler = new ShiftHandler(
      shiftRepo,
      registerRepo as unknown as RegisterRepository,
      authService as unknown as PosAuthorizationService,
    );
  });

  it('opens a new shift successfully and prevents opening a second active shift on the same register', async () => {
    const regList = await registerRepo.findByStoreId(storeId);
    const reg1 = regList[0]!;

    const shift = await handler.openShift({
      storeId,
      registerId: reg1.id.value,
      cashierId,
      openingCashMinor: 500_000, // 5000 BDT
      currency: 'BDT',
      actorUserId: cashierId,
      actorRoles: ['STORE_STAFF'],
    });

    expect(shift.status).toBe('OPEN');
    expect(shift.openingCash.amountMinorUnits).toBe(500_000);
    expect(shiftRepo.save).toHaveBeenCalled();

    // Trying to open another shift on reg1 while first is open throws RegisterShiftAlreadyOpenError
    await expect(
      handler.openShift({
        storeId,
        registerId: reg1.id.value,
        cashierId: 'another-cashier',
        openingCashMinor: 100_000,
        currency: 'BDT',
        actorUserId: 'another-cashier',
        actorRoles: ['STORE_STAFF'],
      }),
    ).rejects.toThrow(RegisterShiftAlreadyOpenError);
  });

  it('records cash movements and sales on an open shift', async () => {
    const regList = await registerRepo.findByStoreId(storeId);
    const reg1 = regList[0]!;

    const shift = await handler.openShift({
      storeId,
      registerId: reg1.id.value,
      cashierId,
      openingCashMinor: 500_000,
      currency: 'BDT',
      actorUserId: cashierId,
      actorRoles: ['STORE_STAFF'],
    });

    // Record cash sale: 200,000 (2000 BDT)
    await handler.recordCashMovement({
      storeId,
      shiftId: shift.id.value,
      kind: 'CASH_SALE',
      amountMinor: 200_000,
      currency: 'BDT',
      actorUserId: cashierId,
      actorRoles: ['STORE_STAFF'],
    });

    // Record cash out: 50,000 (drop to safe)
    await handler.recordCashMovement({
      storeId,
      shiftId: shift.id.value,
      kind: 'CASH_OUT',
      amountMinor: 50_000,
      currency: 'BDT',
      actorUserId: cashierId,
      actorRoles: ['STORE_STAFF'],
    });

    // Expected cash: 500,000 + 200,000 - 50,000 = 650,000
    expect(shift.expectedCash.amountMinorUnits).toBe(650_000);
  });

  it('enforces cashier ownership unless authorized by manager', async () => {
    const regList = await registerRepo.findByStoreId(storeId);
    const reg1 = regList[0]!;

    const shift = await handler.openShift({
      storeId,
      registerId: reg1.id.value,
      cashierId,
      openingCashMinor: 100_000,
      currency: 'BDT',
      actorUserId: cashierId,
      actorRoles: ['STORE_STAFF'],
    });

    // Another staff member tries to close without manager permissions
    await expect(
      handler.closeShift({
        storeId,
        shiftId: shift.id.value,
        actualCashMinor: 100_000,
        currency: 'BDT',
        actorUserId: 'rogue-staff-member',
        actorRoles: ['STORE_STAFF'],
      }),
    ).rejects.toThrow(ShiftCashierMismatchError);

    // Manager can close any cashier's shift
    const closedByManager = await handler.closeShift({
      storeId,
      shiftId: shift.id.value,
      actualCashMinor: 95_000, // Shortage of 5,000
      currency: 'BDT',
      actorUserId: managerId,
      actorRoles: ['STORE_MANAGER'],
    });

    expect(closedByManager.status).toBe('CLOSED');
    expect(closedByManager.isShort).toBe(true);
    expect(closedByManager.difference?.amountMinorUnits).toBe(5_000);
  });

  it('produces a comprehensive store balancing summary across multiple registers', async () => {
    const regList = await registerRepo.findByStoreId(storeId);
    const reg1 = regList[0]!;
    const reg2 = regList[1]!;

    // Reg 1: Open shift
    const shift1 = await handler.openShift({
      storeId,
      registerId: reg1.id.value,
      cashierId: 'cashier-1',
      openingCashMinor: 200_000,
      currency: 'BDT',
      actorUserId: 'cashier-1',
      actorRoles: ['STORE_STAFF'],
    });
    await handler.recordCashMovement({
      storeId,
      shiftId: shift1.id.value,
      kind: 'CASH_SALE',
      amountMinor: 80_000,
      currency: 'BDT',
      actorUserId: 'cashier-1',
      actorRoles: ['STORE_STAFF'],
    });

    // Reg 2: Open shift
    const shift2 = await handler.openShift({
      storeId,
      registerId: reg2.id.value,
      cashierId: 'cashier-2',
      openingCashMinor: 300_000,
      currency: 'BDT',
      actorUserId: 'cashier-2',
      actorRoles: ['STORE_STAFF'],
    });
    await handler.recordCashMovement({
      storeId,
      shiftId: shift2.id.value,
      kind: 'CASH_SALE',
      amountMinor: 150_000,
      currency: 'BDT',
      actorUserId: 'cashier-2',
      actorRoles: ['STORE_STAFF'],
    });

    const summary = await handler.getStoreBalancingSummary(storeId, managerId, ['STORE_MANAGER']);

    expect(summary.totalRegisters).toBe(2);
    expect(summary.activeRegisters).toBe(2);
    expect(summary.openShiftsCount).toBe(2);
    expect(summary.totalOpeningCashMinor).toBe(500_000);
    expect(summary.totalCashSalesMinor).toBe(230_000);
    expect(summary.totalExpectedCashMinor).toBe(730_000);
    expect(summary.registers.length).toBe(2);
  });
});
