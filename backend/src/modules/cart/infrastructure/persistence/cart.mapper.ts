import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { Cart, type CartLineProps } from '../../domain/aggregates/cart.aggregate';
import { CartLineOrmEntity, CartOrmEntity } from './cart.orm-entity';

export function cartToDomain(cart: CartOrmEntity, lines: CartLineOrmEntity[]): Cart {
  return Cart.reconstitute(UniqueID.from(cart.id), {
    customerId: cart.customerId,
    guestToken: cart.guestToken,
    currencyCode: cart.currencyCode,
    status: cart.status,
    version: cart.version,
    lines: Object.freeze(
      lines.map((line): CartLineProps => ({
        lineId: line.id,
        vendorId: line.vendorId,
        storeId: line.storeId,
        productId: line.productId,
        variantId: line.variantId,
        offerId: line.offerId,
        quantity: line.quantity,
        unitPriceSnapshotMinor: line.unitPriceSnapshotMinor,
        currencyCode: line.currencyCode,
      })),
    ),
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  });
}

export function applyCartToOrm(cart: Cart, entity: CartOrmEntity): void {
  entity.id = cart.id.value;
  entity.customerId = cart.customerId;
  entity.guestToken = cart.guestToken;
  entity.currencyCode = cart.currencyCode;
  entity.status = cart.status;
  entity.version = cart.version;
  entity.createdAt = cart.createdAt;
  entity.updatedAt = cart.updatedAt;
}

export function cartLinesToOrm(cart: Cart): CartLineOrmEntity[] {
  const now = cart.updatedAt;
  return cart.lines.map((line) => {
    const entity = new CartLineOrmEntity();
    entity.id = line.lineId;
    entity.cartId = cart.id.value;
    entity.vendorId = line.vendorId;
    entity.storeId = line.storeId;
    entity.productId = line.productId;
    entity.variantId = line.variantId;
    entity.offerId = line.offerId;
    entity.quantity = line.quantity;
    entity.unitPriceSnapshotMinor = line.unitPriceSnapshotMinor;
    entity.currencyCode = line.currencyCode;
    entity.createdAt = now;
    entity.updatedAt = now;
    return entity;
  });
}
