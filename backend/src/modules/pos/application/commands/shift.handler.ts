import { Inject, Injectable } from '@nestjs/common';
import { Money } from '../../../../shared-kernel/domain/money.value-object';
import {
  type CashMovementKind,
  type SalePaymentType,
  Shift,
} from '../../domain/aggregates/shift.aggregate';
import {
  RegisterInactiveError,
  RegisterNotFoundError,
  RegisterShiftAlreadyOpenError,
  ShiftAlreadyClosedError,
  ShiftCashierMismatchError,
  ShiftNotFoundError,
} from '../errors/pos.errors';
import {
  REGISTER_REPOSITORY,
  type RegisterRepository,
} from '../ports/register-repository.interface';
import { SHIFT_REPOSITORY, type ShiftRepository } from '../ports/shift-repository.interface';
import { PosAuthorizationService } from '../services/pos-authorization.service';

export interface OpenShiftInput {
  readonly storeId: string;
  readonly registerId: string;
  readonly cashierId: string;
  readonly openingCashMinor: number;
  readonly currency: string;
  readonly adjustment?:
    | {
        readonly amountMinor: number;
        readonly reason: string;
        readonly actorId: string;
      }
    | undefined;
  readonly actorUserId: string;
  readonly actorRoles: readonly string[];
}

export interface RecordCashMovementInput {
  readonly storeId: string;
  readonly shiftId: string;
  readonly kind: CashMovementKind;
  readonly amountMinor: number;
  readonly currency: string;
  readonly actorUserId: string;
  readonly actorRoles: readonly string[];
}

export interface RecordShiftSaleInput {
  readonly storeId: string;
  readonly shiftId: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly paymentType: SalePaymentType;
  readonly actorUserId: string;
  readonly actorRoles: readonly string[];
}

export interface CloseShiftInput {
  readonly storeId: string;
  readonly shiftId: string;
  readonly actualCashMinor: number;
  readonly currency: string;
  readonly actorUserId: string;
  readonly actorRoles: readonly string[];
}

export interface RegisterBalancingItem {
  readonly registerId: string;
  readonly registerCode: string;
  readonly registerName: string;
  readonly registerStatus: string;
  readonly currentShift?: {
    readonly shiftId: string;
    readonly cashierId: string;
    readonly status: string;
    readonly currency: string;
    readonly openingCashMinor: number;
    readonly cashSalesMinor: number;
    readonly nonCashSalesMinor: number;
    readonly totalSalesMinor: number;
    readonly cashInMinor: number;
    readonly cashRefundsMinor: number;
    readonly cashOutMinor: number;
    readonly expectedCashMinor: number;
    readonly actualCashMinor: number | null;
    readonly differenceMinor: number;
    readonly isShort: boolean;
    readonly openedAt: string;
    readonly closedAt: string | null;
  } | null;
}

export interface StoreBalancingSummary {
  readonly storeId: string;
  readonly totalRegisters: number;
  readonly activeRegisters: number;
  readonly openShiftsCount: number;
  readonly totalOpeningCashMinor: number;
  readonly totalCashSalesMinor: number;
  readonly totalNonCashSalesMinor: number;
  readonly totalSalesMinor: number;
  readonly totalCashInMinor: number;
  readonly totalCashRefundsMinor: number;
  readonly totalCashOutMinor: number;
  readonly totalExpectedCashMinor: number;
  readonly totalActualCashMinor: number;
  readonly totalDifferenceMinor: number;
  readonly currency: string;
  readonly registers: readonly RegisterBalancingItem[];
}

@Injectable()
export class ShiftHandler {
  constructor(
    @Inject(SHIFT_REPOSITORY) private readonly shifts: ShiftRepository,
    @Inject(REGISTER_REPOSITORY) private readonly registers: RegisterRepository,
    @Inject(PosAuthorizationService) private readonly auth: PosAuthorizationService,
  ) {}

  public async openShift(input: OpenShiftInput): Promise<Shift> {
    const store = await this.auth.requireShiftOperator(
      input.storeId,
      input.actorUserId,
      input.actorRoles,
    );

    const register = await this.registers.findById(input.registerId);
    if (!register || register.storeId !== input.storeId) {
      throw new RegisterNotFoundError();
    }
    if (register.status !== 'ACTIVE') {
      throw new RegisterInactiveError();
    }

    const existingActive = await this.shifts.findActiveByRegisterId(input.registerId);
    if (existingActive) {
      throw new RegisterShiftAlreadyOpenError();
    }

    const currency = input.currency.toUpperCase();
    const openingCash = Money.create(input.openingCashMinor, currency);
    const adjustment = input.adjustment
      ? {
          amount: Money.create(input.adjustment.amountMinor, currency),
          reason: input.adjustment.reason,
          actorId: input.adjustment.actorId,
        }
      : undefined;

    const shift = Shift.open(register.id.value, input.cashierId, openingCash, adjustment, {
      storeId: store.storeId,
      vendorId: store.vendorId,
    });

    await this.shifts.save(shift);
    return shift;
  }

  public async getActiveShift(
    storeId: string,
    registerId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Shift | null> {
    await this.auth.requireShiftOperator(storeId, actorUserId, actorRoles);
    const register = await this.registers.findById(registerId);
    if (!register || register.storeId !== storeId) {
      throw new RegisterNotFoundError();
    }
    return this.shifts.findActiveByRegisterId(registerId);
  }

  public async getShiftById(
    storeId: string,
    shiftId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Shift> {
    await this.auth.requireShiftOperator(storeId, actorUserId, actorRoles);
    const shift = await this.shifts.findById(shiftId);
    if (!shift || (shift.storeId && shift.storeId !== storeId)) {
      throw new ShiftNotFoundError();
    }
    return shift;
  }

  public async recordCashMovement(input: RecordCashMovementInput): Promise<Shift> {
    await this.auth.requireShiftOperator(input.storeId, input.actorUserId, input.actorRoles);
    const shift = await this.shifts.findById(input.shiftId);
    if (!shift || (shift.storeId && shift.storeId !== input.storeId)) {
      throw new ShiftNotFoundError();
    }
    if (shift.status !== 'OPEN') {
      throw new ShiftAlreadyClosedError();
    }

    const amount = Money.create(input.amountMinor, input.currency.toUpperCase());
    shift.recordCashMovement(input.kind, amount);
    await this.shifts.save(shift);
    return shift;
  }

  public async recordSale(input: RecordShiftSaleInput): Promise<Shift> {
    await this.auth.requireShiftOperator(input.storeId, input.actorUserId, input.actorRoles);
    const shift = await this.shifts.findById(input.shiftId);
    if (!shift || (shift.storeId && shift.storeId !== input.storeId)) {
      throw new ShiftNotFoundError();
    }
    if (shift.status !== 'OPEN') {
      throw new ShiftAlreadyClosedError();
    }

    const amount = Money.create(input.amountMinor, input.currency.toUpperCase());
    shift.recordSale(amount, input.paymentType);
    await this.shifts.save(shift);
    return shift;
  }

  public async closeShift(input: CloseShiftInput): Promise<Shift> {
    await this.auth.requireShiftOperator(input.storeId, input.actorUserId, input.actorRoles);
    const shift = await this.shifts.findById(input.shiftId);
    if (!shift || (shift.storeId && shift.storeId !== input.storeId)) {
      throw new ShiftNotFoundError();
    }
    if (shift.status !== 'OPEN') {
      throw new ShiftAlreadyClosedError();
    }

    const isManager = await this.auth.isStoreManagerOrPlatformAdmin(
      input.storeId,
      input.actorUserId,
      input.actorRoles,
    );
    if (shift.cashierId !== input.actorUserId && !isManager) {
      throw new ShiftCashierMismatchError();
    }

    const actualCash = Money.create(input.actualCashMinor, input.currency.toUpperCase());
    shift.close(actualCash);
    await this.shifts.save(shift);
    return shift;
  }

  public async getStoreBalancingSummary(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<StoreBalancingSummary> {
    await this.auth.requireShiftOperator(storeId, actorUserId, actorRoles);
    const registersList = await this.registers.findByStoreId(storeId);
    const activeShifts = await this.shifts.findActiveByStoreId(storeId);

    const activeShiftMap = new Map<string, Shift>();
    for (const s of activeShifts) {
      activeShiftMap.set(s.registerId, s);
    }

    let defaultCurrency = 'BDT';
    let totalOpeningCashMinor = 0;
    let totalCashSalesMinor = 0;
    let totalNonCashSalesMinor = 0;
    let totalSalesMinor = 0;
    let totalCashInMinor = 0;
    let totalCashRefundsMinor = 0;
    let totalCashOutMinor = 0;
    let totalExpectedCashMinor = 0;
    let totalActualCashMinor = 0;
    let totalDifferenceMinor = 0;
    let openShiftsCount = 0;

    const registerItems: RegisterBalancingItem[] = [];

    for (const reg of registersList) {
      let shift = activeShiftMap.get(reg.id.value);
      if (!shift) {
        shift = (await this.shifts.findLatestByRegisterId(reg.id.value)) ?? undefined;
      }

      if (shift) {
        defaultCurrency = shift.openingCash.currency;
        if (shift.status === 'OPEN') {
          openShiftsCount++;
          totalOpeningCashMinor += shift.openingCash.amountMinorUnits;
          totalCashSalesMinor += shift.cashSales.amountMinorUnits;
          totalNonCashSalesMinor += shift.nonCashSales.amountMinorUnits;
          totalSalesMinor += shift.totalSales.amountMinorUnits;
          totalCashInMinor += shift.cashIn.amountMinorUnits;
          totalCashRefundsMinor += shift.cashRefunds.amountMinorUnits;
          totalCashOutMinor += shift.cashOut.amountMinorUnits;
          totalExpectedCashMinor += shift.expectedCash.amountMinorUnits;
        } else if (shift.actualCash) {
          totalActualCashMinor += shift.actualCash.amountMinorUnits;
          totalDifferenceMinor += shift.difference?.amountMinorUnits ?? 0;
        }

        registerItems.push({
          registerId: reg.id.value,
          registerCode: reg.code,
          registerName: reg.name,
          registerStatus: reg.status,
          currentShift: {
            shiftId: shift.id.value,
            cashierId: shift.cashierId,
            status: shift.status,
            currency: shift.openingCash.currency,
            openingCashMinor: shift.openingCash.amountMinorUnits,
            cashSalesMinor: shift.cashSales.amountMinorUnits,
            nonCashSalesMinor: shift.nonCashSales.amountMinorUnits,
            totalSalesMinor: shift.totalSales.amountMinorUnits,
            cashInMinor: shift.cashIn.amountMinorUnits,
            cashRefundsMinor: shift.cashRefunds.amountMinorUnits,
            cashOutMinor: shift.cashOut.amountMinorUnits,
            expectedCashMinor: shift.expectedCash.amountMinorUnits,
            actualCashMinor: shift.actualCash ? shift.actualCash.amountMinorUnits : null,
            differenceMinor: shift.difference?.amountMinorUnits ?? 0,
            isShort: shift.isShort,
            openedAt: shift.openedAt.toISOString(),
            closedAt: shift.closedAt ? shift.closedAt.toISOString() : null,
          },
        });
      } else {
        registerItems.push({
          registerId: reg.id.value,
          registerCode: reg.code,
          registerName: reg.name,
          registerStatus: reg.status,
          currentShift: null,
        });
      }
    }

    return {
      storeId,
      totalRegisters: registersList.length,
      activeRegisters: registersList.filter((r) => r.status === 'ACTIVE').length,
      openShiftsCount,
      totalOpeningCashMinor,
      totalCashSalesMinor,
      totalNonCashSalesMinor,
      totalSalesMinor,
      totalCashInMinor,
      totalCashRefundsMinor,
      totalCashOutMinor,
      totalExpectedCashMinor,
      totalActualCashMinor,
      totalDifferenceMinor,
      currency: defaultCurrency,
      registers: registerItems,
    };
  }
}
