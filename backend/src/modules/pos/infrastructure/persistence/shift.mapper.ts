import { Money } from '../../../../shared-kernel/domain/money.value-object';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { Shift, type ShiftProps } from '../../domain/aggregates/shift.aggregate';
import { ShiftOrmEntity } from './shift.orm-entity';

export class ShiftMapper {
  public static toDomain(entity: ShiftOrmEntity): Shift {
    const currency = entity.currency;
    const openingCash = Money.create(Number(entity.openingCashMinor), currency);
    const openingCashBeforeAdjustment = Money.create(
      Number(entity.openingCashBeforeAdjMinor),
      currency,
    );

    const props: ShiftProps = {
      storeId: entity.storeId,
      vendorId: entity.vendorId,
      registerId: entity.registerId,
      cashierId: entity.cashierId,
      openingCash,
      openingCashBeforeAdjustment,
      openingBalanceAdjustment:
        Number(entity.adjAmountMinor) > 0 && entity.adjReason && entity.adjActorId
          ? {
              amount: Money.create(Number(entity.adjAmountMinor), currency),
              reason: entity.adjReason,
              actorId: entity.adjActorId,
            }
          : undefined,
      totalSales: Money.create(Number(entity.totalSalesMinor), currency),
      nonCashSales: Money.create(Number(entity.nonCashSalesMinor), currency),
      cashSales: Money.create(Number(entity.cashSalesMinor), currency),
      cashIn: Money.create(Number(entity.cashInMinor), currency),
      cashRefunds: Money.create(Number(entity.cashRefundsMinor), currency),
      cashOut: Money.create(Number(entity.cashOutMinor), currency),
      actualCash:
        entity.actualCashMinor !== null && entity.actualCashMinor !== undefined
          ? Money.create(Number(entity.actualCashMinor), currency)
          : undefined,
      status: entity.status,
      openedAt: entity.openedAt,
      closedAt: entity.closedAt ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return Shift.rehydrate(UniqueID.from(entity.id), props);
  }

  public static toOrm(shift: Shift): ShiftOrmEntity {
    const entity = new ShiftOrmEntity();
    entity.id = shift.id.value;
    entity.storeId = shift.storeId ?? '';
    entity.vendorId = shift.vendorId ?? '';
    entity.registerId = shift.registerId;
    entity.cashierId = shift.cashierId;
    entity.currency = shift.openingCash.currency;
    entity.openingCashMinor = shift.openingCash.amountMinorUnits;
    entity.openingCashBeforeAdjMinor = shift.openingCashBeforeAdjustment.amountMinorUnits;

    if (shift.openingBalanceAdjustment) {
      entity.adjAmountMinor = shift.openingBalanceAdjustment.amount.amountMinorUnits;
      entity.adjReason = shift.openingBalanceAdjustment.reason;
      entity.adjActorId = shift.openingBalanceAdjustment.actorId;
    } else {
      entity.adjAmountMinor = 0;
      entity.adjReason = null;
      entity.adjActorId = null;
    }

    entity.cashSalesMinor = shift.cashSales.amountMinorUnits;
    entity.totalSalesMinor = shift.totalSales.amountMinorUnits;
    entity.nonCashSalesMinor = shift.nonCashSales.amountMinorUnits;
    entity.cashInMinor = shift.cashIn.amountMinorUnits;
    entity.cashRefundsMinor = shift.cashRefunds.amountMinorUnits;
    entity.cashOutMinor = shift.cashOut.amountMinorUnits;
    entity.actualCashMinor = shift.actualCash ? shift.actualCash.amountMinorUnits : null;
    entity.status = shift.status;
    entity.openedAt = shift.openedAt;
    entity.closedAt = shift.closedAt ?? null;
    entity.createdAt = shift.createdAt;
    entity.updatedAt = shift.updatedAt;

    return entity;
  }
}
