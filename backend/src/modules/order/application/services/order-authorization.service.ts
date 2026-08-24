import { Inject, Injectable } from '@nestjs/common';
import {
  STORE_ACCESS,
  type StoreAccessPort,
} from '../../../../shared-kernel/application/ports/store-access.port';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import type { Order } from '../../domain/aggregates/order.aggregate';
import { OrderAccessDeniedError, OrderNotFoundError } from '../errors/order.errors';
import { ORDER_REPOSITORY, type OrderRepository } from '../ports/order-repository.interface';

@Injectable()
export class OrderAuthorizationService {
  constructor(
    @Inject(STORE_ACCESS) private readonly stores: StoreAccessPort,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
  ) {}

  public async requireReadable(
    order: Order,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<void> {
    if (actorRoles.includes('PLATFORM_ADMIN')) {
      return;
    }
    if (order.customerId && order.customerId === actorUserId) {
      return;
    }
    const store = await this.stores.findById(order.storeId);
    if (store?.staffUserIds.includes(actorUserId) || store?.managerUserIds.includes(actorUserId)) {
      return;
    }
    const vendor = await this.vendors.findById(order.vendorId);
    if (
      vendor &&
      (vendor.ownerUserId === actorUserId || vendor.staffUserIds.includes(actorUserId))
    ) {
      return;
    }
    throw new OrderAccessDeniedError();
  }

  public async requireFulfiller(
    order: Order,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<void> {
    if (actorRoles.includes('PLATFORM_ADMIN')) {
      return;
    }
    const store = await this.stores.findById(order.storeId);
    if (store?.managerUserIds.includes(actorUserId) || store?.staffUserIds.includes(actorUserId)) {
      return;
    }
    const vendor = await this.vendors.findById(order.vendorId);
    if (
      vendor &&
      (vendor.ownerUserId === actorUserId || vendor.staffUserIds.includes(actorUserId))
    ) {
      return;
    }
    throw new OrderAccessDeniedError();
  }

  public async getOwnedOrThrow(
    orders: OrderRepository,
    orderId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Order> {
    const order = await orders.findById(orderId);
    if (!order) {
      throw new OrderNotFoundError();
    }
    await this.requireReadable(order, actorUserId, actorRoles);
    return order;
  }
}

export { ORDER_REPOSITORY };
