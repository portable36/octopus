import { createHash } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  INVENTORY_PORT,
  type InventoryPort,
} from '../../../../shared-kernel/application/ports/inventory.port';
import {
  ORDER_PORT,
  type OrderPort,
  type OrderReturnSnapshot,
} from '../../../../shared-kernel/application/ports/order.port';
import {
  USER_CONTACT_PORT,
  type UserContactPort,
} from '../../../../shared-kernel/application/ports/user-contact.port';
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
  type PublicOrderReturnLookupResult,
  type ReturnItemCondition,
  type ReturnReasonCode,
  type ReturnTimelineMilestone,
  type ReturnTimelineResult,
  RETURN_QTY_RELEASE_STATUSES,
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
    @Optional() @Inject(USER_CONTACT_PORT) private readonly userContact?: UserContactPort,
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

  public async verifyOrderCustomerEmail(
    order: OrderReturnSnapshot,
    normalizedEmail: string,
  ): Promise<void> {
    if (order.customerId) {
      const email = await this.userContact?.findEmailByUserId(order.customerId);
      if (email && email.trim().toLowerCase() === normalizedEmail) {
        return;
      }
      const userId = await this.userContact?.findUserIdByEmail(normalizedEmail);
      if (userId && userId === order.customerId) {
        return;
      }
      if (email) {
        throw new ReturnNotReturnableError('Email address does not match this order.');
      }
    }
  }

  public async publicLookup(input: {
    readonly orderNumber: string;
    readonly email: string;
  }): Promise<PublicOrderReturnLookupResult> {
    const normalizedNumber = input.orderNumber.trim();
    const normalizedEmail = input.email.trim().toLowerCase();

    const order = await this.orders.getReturnSnapshotByOrderNumber(normalizedNumber);
    if (!order) {
      throw new ReturnNotReturnableError(`Order #${normalizedNumber} not found.`);
    }

    await this.verifyOrderCustomerEmail(order, normalizedEmail);

    const existingReturns = await this.returns.listByOrderId(order.orderId);
    const activeReturns = existingReturns.filter(
      (r) => !RETURN_QTY_RELEASE_STATUSES.includes(r.status),
    );

    const now = new Date();
    const daysSinceAnchor = daysBetween(order.returnWindowAnchorAt, now);
    const daysRemaining = Math.max(0, DEFAULT_RETURN_WINDOW_DAYS - daysSinceAnchor);

    let returnEligible = true;
    let returnIneligibleReason: string | null = null;

    if (order.status !== 'FULFILLED' && order.status !== 'COMPLETED') {
      returnEligible = false;
      returnIneligibleReason = `Order is in status "${order.status}". Returns are only allowed once an order is delivered or completed.`;
    } else if (order.paymentStatus !== 'PAID') {
      returnEligible = false;
      returnIneligibleReason = `Order payment is "${order.paymentStatus}". Returns require a paid order.`;
    } else if (daysSinceAnchor > DEFAULT_RETURN_WINDOW_DAYS) {
      returnEligible = false;
      returnIneligibleReason = `The ${DEFAULT_RETURN_WINDOW_DAYS}-day return window for this order has expired.`;
    }

    const qtyRows = await this.returns.listQuantityRowsByOrderId(order.orderId);

    const lineResults = order.lines.map((orderLine) => {
      const alreadyReturned = activeReturns.reduce((sum, ret) => {
        const item = ret.items.find((i) => i.orderItemId === orderLine.lineId);
        return sum + (item ? item.quantity : 0);
      }, 0);

      const returnable = computeReturnableQuantity(
        {
          orderItemId: orderLine.lineId,
          fulfilledQuantity: orderLine.fulfilledQuantity,
        },
        qtyRows,
      );

      return {
        orderItemId: orderLine.lineId,
        productId: orderLine.productId,
        variantId: orderLine.variantId,
        productName: `Item #${orderLine.productId.slice(0, 8)}`,
        unitPriceMinor: orderLine.unitPriceMinor,
        quantity: orderLine.quantity,
        fulfilledQuantity: orderLine.fulfilledQuantity,
        alreadyReturnedQuantity: alreadyReturned,
        returnableQuantity: returnable,
      };
    });

    const totalReturnable = lineResults.reduce((sum, l) => sum + l.returnableQuantity, 0);
    if (returnEligible && totalReturnable === 0) {
      returnEligible = false;
      returnIneligibleReason =
        'All items in this order have already been returned or have pending return requests.';
    }

    return {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerEmail: normalizedEmail,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus:
        order.status === 'FULFILLED' || order.status === 'COMPLETED'
          ? 'FULFILLED'
          : 'PARTIALLY_FULFILLED',
      currencyCode: order.currencyCode,
      totalMinor: order.totalMinor,
      orderDate: order.returnWindowAnchorAt,
      returnEligible,
      returnIneligibleReason,
      returnWindowDays: DEFAULT_RETURN_WINDOW_DAYS,
      daysRemainingInReturnWindow: daysRemaining,
      lines: lineResults,
      existingReturns: existingReturns.map((r) => ({
        returnId: r.id.value,
        status: r.status,
        requestedAt: r.requestedAt,
        itemCount: r.items.length,
        totalQuantity: r.items.reduce((s, i) => s + i.quantity, 0),
      })),
    };
  }

  public async publicRequestReturn(input: {
    readonly orderNumber: string;
    readonly email: string;
    readonly idempotencyKey: string;
    readonly note?: string | null;
    readonly items: readonly {
      readonly orderItemId: string;
      readonly quantity: number;
      readonly reasonCode: string;
    }[];
  }): Promise<ReturnRequest> {
    const normalizedNumber = input.orderNumber.trim();
    const normalizedEmail = input.email.trim().toLowerCase();

    const order = await this.orders.getReturnSnapshotByOrderNumber(normalizedNumber);
    if (!order) {
      throw new ReturnNotReturnableError(`Order #${normalizedNumber} not found.`);
    }

    await this.verifyOrderCustomerEmail(order, normalizedEmail);

    if (order.status !== 'FULFILLED' && order.status !== 'COMPLETED') {
      throw new ReturnNotReturnableError('Order is not in a returnable fulfillment state.');
    }
    if (order.paymentStatus !== 'PAID') {
      throw new ReturnNotReturnableError('Order payment is not eligible for return.');
    }
    if (daysBetween(order.returnWindowAnchorAt, new Date()) > DEFAULT_RETURN_WINDOW_DAYS) {
      throw new ReturnWindowExpiredError();
    }

    const requestBody = {
      orderNumber: normalizedNumber,
      email: normalizedEmail,
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
        productName: `Item #${orderLine.productId.slice(0, 8)}`,
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
      customerId: order.customerId ?? `guest:${normalizedEmail}`,
      vendorId: order.vendorId,
      storeId: order.storeId,
      ...(input.note !== undefined && input.note !== null ? { customerNote: input.note } : {}),
      items: lines,
    });
    await this.returns.save(returnRequest);
    await this.returns.saveOperation({
      idempotencyKey: input.idempotencyKey,
      operationType: 'public_request_return',
      requestHash,
      responseJson: { returnId: returnRequest.id.value },
    });
    return returnRequest;
  }

  public async publicGetReturnTimeline(input: {
    readonly returnId: string;
    readonly orderNumber?: string | undefined;
    readonly email?: string | undefined;
  }): Promise<ReturnTimelineResult> {
    const ret = await this.returns.findById(input.returnId);
    if (!ret) {
      throw new ReturnNotFoundError(input.returnId);
    }

    const order = await this.orders.getReturnSnapshot(ret.orderId);
    if (order && input.email) {
      await this.verifyOrderCustomerEmail(order, input.email.trim().toLowerCase());
    }

    const orderNumber = order?.orderNumber ?? ret.orderId;
    return this.buildReturnTimeline(ret, orderNumber);
  }

  public async publicCancelReturn(input: {
    readonly returnId: string;
    readonly orderNumber?: string | undefined;
    readonly email?: string | undefined;
  }): Promise<ReturnTimelineResult> {
    const ret = await this.returns.findById(input.returnId);
    if (!ret) {
      throw new ReturnNotFoundError(input.returnId);
    }

    const order = await this.orders.getReturnSnapshot(ret.orderId);
    if (order && input.email) {
      await this.verifyOrderCustomerEmail(order, input.email.trim().toLowerCase());
    }

    if (
      ret.status !== 'REQUESTED' &&
      ret.status !== 'UNDER_REVIEW' &&
      ret.status !== 'APPROVED' &&
      ret.status !== 'AWAITING_RETURN'
    ) {
      throw new ReturnNotReturnableError(
        `Return request cannot be cancelled in status "${ret.status}".`,
      );
    }

    ret.cancel();
    await this.returns.save(ret);

    const orderNumber = order?.orderNumber ?? ret.orderId;
    return this.buildReturnTimeline(ret, orderNumber);
  }

  public buildReturnTimeline(ret: ReturnRequest, orderNumber: string): ReturnTimelineResult {
    const status = ret.status;

    let statusLabel = 'Return Requested';
    let statusDescription = 'Your return request has been submitted and is awaiting review.';

    switch (status) {
      case 'REQUESTED':
        statusLabel = 'Return Requested';
        statusDescription = 'Your return request has been submitted and is awaiting review.';
        break;
      case 'UNDER_REVIEW':
        statusLabel = 'Under Review';
        statusDescription = 'Our team is reviewing your return request.';
        break;
      case 'APPROVED':
      case 'AWAITING_RETURN':
        statusLabel = 'Approved — Awaiting Shipment';
        statusDescription =
          'Return approved. Please pack your items and hand them over to courier or drop-off.';
        break;
      case 'RECEIVED':
        statusLabel = 'Items Received';
        statusDescription =
          'Your package has arrived at our warehouse and is queued for inspection.';
        break;
      case 'INSPECTING':
        statusLabel = 'Under Inspection';
        statusDescription = 'Items are being checked for quality and condition.';
        break;
      case 'INSPECTION_APPROVED':
        statusLabel = 'Inspection Passed';
        statusDescription = 'Items passed quality check. Refund will be processed shortly.';
        break;
      case 'INSPECTION_REJECTED':
        statusLabel = 'Inspection Failed';
        statusDescription =
          ret.inspection?.reason ?? 'Items did not meet the return condition requirements.';
        break;
      case 'REJECTED':
        statusLabel = 'Return Rejected';
        statusDescription = ret.rejectionNote ?? 'Your return request was not approved.';
        break;
      case 'CANCELLED':
        statusLabel = 'Return Cancelled';
        statusDescription = 'This return request was cancelled.';
        break;
    }

    const canCancel =
      status === 'REQUESTED' ||
      status === 'UNDER_REVIEW' ||
      status === 'APPROVED' ||
      status === 'AWAITING_RETURN';

    const milestones: ReturnTimelineMilestone[] = [
      {
        key: 'REQUESTED',
        label: 'Return Requested',
        state: 'COMPLETED',
        timestamp: ret.requestedAt.toISOString(),
        description: 'Customer submitted self-service return request.',
      },
      {
        key: 'UNDER_REVIEW',
        label: 'Team Review',
        state:
          status === 'CANCELLED' && !ret.reviewedAt
            ? 'CANCELLED'
            : status === 'REJECTED'
              ? 'REJECTED'
              : status === 'REQUESTED'
                ? 'CURRENT'
                : 'COMPLETED',
        timestamp: ret.reviewedAt ? ret.reviewedAt.toISOString() : null,
        description:
          status === 'REJECTED'
            ? (ret.rejectionNote ?? 'Return request was rejected during review.')
            : status === 'REQUESTED'
              ? 'Request is queued for review by store staff.'
              : 'Return request was reviewed and verified.',
      },
      {
        key: 'APPROVED',
        label: 'Return Approved & Drop-off',
        state:
          status === 'CANCELLED' && !ret.approvedAt
            ? 'CANCELLED'
            : status === 'REJECTED'
              ? 'UPCOMING'
              : status === 'REQUESTED' || status === 'UNDER_REVIEW'
                ? 'UPCOMING'
                : status === 'APPROVED' || status === 'AWAITING_RETURN'
                  ? 'CURRENT'
                  : 'COMPLETED',
        timestamp: ret.approvedAt ? ret.approvedAt.toISOString() : null,
        description:
          status === 'APPROVED' || status === 'AWAITING_RETURN'
            ? 'Return approved. Package items securely and hand them over to courier.'
            : ret.approvedAt
              ? 'Return authorization issued.'
              : 'Awaiting review decision.',
      },
      {
        key: 'RECEIVED',
        label: 'Warehouse Intake',
        state:
          status === 'CANCELLED' && !ret.receivedAt
            ? 'CANCELLED'
            : status === 'REJECTED'
              ? 'UPCOMING'
              : ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'AWAITING_RETURN'].includes(status)
                ? 'UPCOMING'
                : status === 'RECEIVED'
                  ? 'CURRENT'
                  : 'COMPLETED',
        timestamp: ret.receivedAt ? ret.receivedAt.toISOString() : null,
        description: ret.receivedAt
          ? 'Package received and logged at fulfillment center.'
          : 'Package in transit to fulfillment center.',
      },
      {
        key: 'INSPECTED',
        label: 'Quality Inspection',
        state:
          status === 'CANCELLED' && !ret.inspectedAt
            ? 'CANCELLED'
            : status === 'INSPECTION_REJECTED'
              ? 'REJECTED'
              : ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'AWAITING_RETURN', 'RECEIVED'].includes(
                    status,
                  )
                ? 'UPCOMING'
                : status === 'INSPECTING'
                  ? 'CURRENT'
                  : 'COMPLETED',
        timestamp: ret.inspectedAt ? ret.inspectedAt.toISOString() : null,
        description:
          status === 'INSPECTION_REJECTED'
            ? (ret.inspection?.reason ?? 'Inspection failed.')
            : status === 'INSPECTION_APPROVED'
              ? 'Items verified and approved for refund.'
              : status === 'INSPECTING'
                ? 'Inspection in progress.'
                : 'Awaiting package intake and inspection.',
      },
      {
        key: 'RESOLUTION',
        label: 'Refund / Resolution',
        state:
          status === 'INSPECTION_APPROVED'
            ? 'COMPLETED'
            : status === 'CANCELLED'
              ? 'CANCELLED'
              : status === 'REJECTED' || status === 'INSPECTION_REJECTED'
                ? 'REJECTED'
                : 'UPCOMING',
        timestamp: ret.completedAt ? ret.completedAt.toISOString() : null,
        description:
          status === 'INSPECTION_APPROVED'
            ? 'Return completed. Refund processed.'
            : status === 'CANCELLED'
              ? 'Return cancelled.'
              : status === 'REJECTED' || status === 'INSPECTION_REJECTED'
                ? 'Closed without refund.'
                : 'Awaiting inspection outcome.',
      },
    ];

    return {
      id: ret.id.value,
      orderId: ret.orderId,
      orderNumber,
      status: ret.status,
      statusLabel,
      statusDescription,
      customerNote: ret.customerNote,
      rejectionReasonCode: ret.rejectionReasonCode,
      rejectionNote: ret.rejectionNote,
      canCancel,
      requestedAt: ret.requestedAt.toISOString(),
      reviewedAt: ret.reviewedAt ? ret.reviewedAt.toISOString() : null,
      approvedAt: ret.approvedAt ? ret.approvedAt.toISOString() : null,
      receivedAt: ret.receivedAt ? ret.receivedAt.toISOString() : null,
      inspectedAt: ret.inspectedAt ? ret.inspectedAt.toISOString() : null,
      completedAt: ret.completedAt ? ret.completedAt.toISOString() : null,
      items: ret.items.map((item) => {
        const reason = getReturnReason(item.reasonCode);
        return {
          orderItemId: item.orderItemId,
          productId: item.productId,
          variantId: item.variantId,
          sku: item.sku,
          productName: item.productName,
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          lineTotalMinor: item.lineTotalMinor,
          reasonCode: item.reasonCode,
          reasonLabel: reason?.label ?? item.reasonCode,
        };
      }),
      inspection: ret.inspection
        ? {
            condition: ret.inspection.condition,
            quantityReceived: ret.inspection.quantityReceived,
            quantityAccepted: ret.inspection.quantityAccepted,
            quantityRejected: ret.inspection.quantityRejected,
            inspectedAt: ret.inspection.inspectedAt.toISOString(),
            note: ret.inspection.note,
            reason: ret.inspection.reason,
          }
        : null,
      milestones,
    };
  }
}
