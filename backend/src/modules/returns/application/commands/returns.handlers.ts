import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  INVENTORY_PORT,
  type InventoryPort,
} from '../../../../shared-kernel/application/ports/inventory.port';
import {
  ORDER_PORT,
  type OrderPort,
  type OrderReturnSnapshot,
} from '../../../../shared-kernel/application/ports/order.port';
import { ReturnRequest } from '../../domain/aggregates/return-request.aggregate';
import {
  ReturnNotReturnableError,
  ReturnQuantityExceededError,
  ReturnWindowExpiredError,
  InvalidReturnReasonError,
} from '../../domain/errors/returns.errors';
import {
  DEFAULT_RETURN_WINDOW_DAYS,
  getReturnReason,
  type ReturnItemCondition,
  type ReturnReasonCode,
} from '../../domain/returns.types';
import { allocateAcceptedRestoreLines } from '../../domain/services/allocate-accepted-restore';
import { computeReturnableQuantity } from '../../domain/services/returnable-quantity';
import {
  ReturnNotFoundError,
  ReturnsAccessDeniedError,
  ReturnsIdempotencyConflictError,
} from '../errors/returns.errors';
import { RETURNS_REPOSITORY, type ReturnsRepository } from '../ports/returns-repository.interface';
import { ReturnsAuthorizationService } from '../services/returns-authorization.service';

function hashRequest(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

@Injectable()
export class ReturnsHandlers {
  constructor(
    @Inject(RETURNS_REPOSITORY) private readonly returns: ReturnsRepository,
    @Inject(ORDER_PORT) private readonly orders: OrderPort,
    @Inject(INVENTORY_PORT) private readonly inventory: InventoryPort,
    @Inject(ReturnsAuthorizationService) private readonly authz: ReturnsAuthorizationService,
  ) {}

  public async requestReturn(input: {
    readonly orderId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly idempotencyKey: string;
    readonly note?: string | null;
    readonly items: readonly {
      readonly orderItemId: string;
      readonly quantity: number;
      readonly reasonCode: string;
    }[];
  }): Promise<ReturnRequest> {
    this.authz.requirePermission(input.actorRoles, 'return.create');

    const requestBody = {
      orderId: input.orderId,
      note: input.note ?? null,
      items: input.items,
    };
    const requestHash = hashRequest(requestBody);
    const existingOp = await this.returns.findOperation(input.idempotencyKey);
    if (existingOp) {
      if (existingOp.requestHash !== requestHash) {
        throw new ReturnsIdempotencyConflictError();
      }
      const existingId = String(existingOp.responseJson.returnId ?? '');
      const existing = await this.returns.findById(existingId);
      if (!existing) {
        throw new ReturnNotFoundError();
      }
      return existing;
    }

    const order = await this.requireReturnableOrder(input.orderId, input.actorUserId);
    const qtyRows = await this.returns.listQuantityRowsByOrderId(order.orderId);

    const lines = input.items.map((item) => {
      const reason = getReturnReason(item.reasonCode);
      if (!reason || !reason.customerSelectable) {
        throw new InvalidReturnReasonError(item.reasonCode);
      }
      const orderLine = order.lines.find((l) => l.lineId === item.orderItemId);
      if (!orderLine) {
        throw new ReturnNotReturnableError(`Order item ${item.orderItemId} not found.`);
      }
      if (orderLine.fulfilledQuantity < 1) {
        throw new ReturnNotReturnableError(`Order item ${item.orderItemId} is not fulfilled.`);
      }
      const returnable = computeReturnableQuantity(
        {
          orderItemId: orderLine.lineId,
          fulfilledQuantity: orderLine.fulfilledQuantity,
        },
        qtyRows,
      );
      if (item.quantity > returnable) {
        throw new ReturnQuantityExceededError(
          `Requested ${item.quantity} exceeds returnable ${returnable} for line ${item.orderItemId}.`,
        );
      }
      const unitShare =
        orderLine.quantity > 0 ? Math.floor(orderLine.lineTotalMinor / orderLine.quantity) : 0;
      return {
        orderItemId: orderLine.lineId,
        productId: orderLine.productId,
        variantId: orderLine.variantId,
        warehouseId: orderLine.warehouseId,
        sku: orderLine.variantId,
        productName: orderLine.productId,
        unitPriceMinor: orderLine.unitPriceMinor,
        lineDiscountMinor: Math.floor(
          (orderLine.lineDiscountMinor * item.quantity) / orderLine.quantity,
        ),
        lineTaxMinor: Math.floor((orderLine.lineTaxMinor * item.quantity) / orderLine.quantity),
        lineTotalMinor: unitShare * item.quantity,
        quantity: item.quantity,
        reasonCode: item.reasonCode as ReturnReasonCode,
      };
    });

    const returnRequest = ReturnRequest.create({
      orderId: order.orderId,
      customerId: order.customerId!,
      vendorId: order.vendorId,
      storeId: order.storeId,
      ...(input.note !== undefined ? { customerNote: input.note } : {}),
      items: lines,
    });
    await this.returns.save(returnRequest);
    await this.returns.saveOperation({
      idempotencyKey: input.idempotencyKey,
      operationType: 'request_return',
      requestHash,
      responseJson: { returnId: returnRequest.id.value },
    });
    return returnRequest;
  }

  public async getReturn(input: {
    readonly returnId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<ReturnRequest> {
    this.authz.requirePermission(input.actorRoles, 'return.read');
    const returnRequest = await this.requireReturn(input.returnId);
    if (input.actorRoles.includes('CUSTOMER') && !input.actorRoles.includes('PLATFORM_ADMIN')) {
      this.authz.requireCustomerOwner(returnRequest, input.actorUserId);
    } else if (!input.actorRoles.includes('PLATFORM_ADMIN')) {
      await this.authz.requireStaffScope(returnRequest, input.actorUserId, input.actorRoles);
    }
    return returnRequest;
  }

  public async listByOrder(input: {
    readonly orderId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<ReturnRequest[]> {
    this.authz.requirePermission(input.actorRoles, 'return.read');
    const order = await this.orders.getReturnSnapshot(input.orderId);
    if (!order) {
      return [];
    }
    if (input.actorRoles.includes('CUSTOMER') && !input.actorRoles.includes('PLATFORM_ADMIN')) {
      if (order.customerId !== input.actorUserId) {
        throw new ReturnsAccessDeniedError();
      }
    } else if (!input.actorRoles.includes('PLATFORM_ADMIN')) {
      await this.authz.requireStaffScope(
        { vendorId: order.vendorId, storeId: order.storeId },
        input.actorUserId,
        input.actorRoles,
      );
    }
    return this.returns.listByOrderId(input.orderId);
  }

  public async approve(input: {
    readonly returnId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<ReturnRequest> {
    this.authz.requirePermission(input.actorRoles, 'return.review');
    const returnRequest = await this.requireReturn(input.returnId);
    await this.authz.requireStaffScope(returnRequest, input.actorUserId, input.actorRoles);
    returnRequest.approve();
    await this.returns.save(returnRequest);
    return returnRequest;
  }

  public async reject(input: {
    readonly returnId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly reasonCode: string;
    readonly note?: string | null;
  }): Promise<ReturnRequest> {
    this.authz.requirePermission(input.actorRoles, 'return.review');
    const returnRequest = await this.requireReturn(input.returnId);
    await this.authz.requireStaffScope(returnRequest, input.actorUserId, input.actorRoles);
    if (returnRequest.status === 'REQUESTED') {
      returnRequest.startReview();
    }
    returnRequest.reject({
      reasonCode: input.reasonCode,
      ...(input.note !== undefined ? { note: input.note } : {}),
    });
    await this.returns.save(returnRequest);
    return returnRequest;
  }

  public async receive(input: {
    readonly returnId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<ReturnRequest> {
    this.authz.requirePermission(input.actorRoles, 'return.receive');
    const returnRequest = await this.requireReturn(input.returnId);
    await this.authz.requireStaffScope(returnRequest, input.actorUserId, input.actorRoles);
    returnRequest.markReceived();
    returnRequest.startInspection();
    await this.returns.save(returnRequest);
    return returnRequest;
  }

  public async inspect(input: {
    readonly returnId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly quantityReceived: number;
    readonly quantityAccepted: number;
    readonly quantityRejected: number;
    readonly condition: ReturnItemCondition;
    readonly reason?: string | null;
    readonly note?: string | null;
  }): Promise<ReturnRequest> {
    this.authz.requirePermission(input.actorRoles, 'return.inspect');
    const returnRequest = await this.requireReturn(input.returnId);
    await this.authz.requireStaffScope(returnRequest, input.actorUserId, input.actorRoles);
    if (returnRequest.status === 'RECEIVED') {
      returnRequest.startInspection();
    }
    returnRequest.completeInspection({
      quantityReceived: input.quantityReceived,
      quantityAccepted: input.quantityAccepted,
      quantityRejected: input.quantityRejected,
      condition: input.condition,
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
      inspectedBy: input.actorUserId,
    });
    await this.returns.save(returnRequest);

    if (
      returnRequest.status === 'INSPECTION_APPROVED' &&
      returnRequest.inspection &&
      returnRequest.inspection.quantityAccepted > 0
    ) {
      const lines = allocateAcceptedRestoreLines({
        items: returnRequest.items,
        quantityAccepted: returnRequest.inspection.quantityAccepted,
      });
      if (lines.length > 0) {
        await this.inventory.restoreFromReturn({
          returnId: returnRequest.id.value,
          storeId: returnRequest.storeId,
          condition: returnRequest.inspection.condition,
          lines,
          actorUserId: input.actorUserId,
          idempotencyKey: `return-restore:${returnRequest.id.value}`,
        });
      }
    }

    return returnRequest;
  }

  public async cancel(input: {
    readonly returnId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<ReturnRequest> {
    this.authz.requirePermission(input.actorRoles, 'return.create');
    const returnRequest = await this.requireReturn(input.returnId);
    this.authz.requireCustomerOwner(returnRequest, input.actorUserId);
    returnRequest.cancel();
    await this.returns.save(returnRequest);
    return returnRequest;
  }

  private async requireReturn(returnId: string): Promise<ReturnRequest> {
    const returnRequest = await this.returns.findById(returnId);
    if (!returnRequest) {
      throw new ReturnNotFoundError();
    }
    return returnRequest;
  }

  private async requireReturnableOrder(
    orderId: string,
    actorUserId: string,
  ): Promise<OrderReturnSnapshot> {
    const order = await this.orders.getReturnSnapshot(orderId);
    if (!order) {
      throw new ReturnNotReturnableError('Order not found.');
    }
    if (order.customerId !== actorUserId) {
      throw new ReturnNotReturnableError('Customer does not own this order.');
    }
    if (order.status !== 'FULFILLED' && order.status !== 'COMPLETED') {
      throw new ReturnNotReturnableError('Order is not in a returnable fulfillment state.');
    }
    if (order.paymentStatus !== 'PAID') {
      throw new ReturnNotReturnableError('Order payment is not eligible for return.');
    }
    if (daysBetween(order.returnWindowAnchorAt, new Date()) > DEFAULT_RETURN_WINDOW_DAYS) {
      throw new ReturnWindowExpiredError();
    }
    return order;
  }
}
