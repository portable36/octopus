import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  CART_PORT,
  type CartOwnerRef,
  type CartPort,
} from '../../../../shared-kernel/application/ports/cart.port';
import {
  INVENTORY_PORT,
  type InventoryPort,
} from '../../../../shared-kernel/application/ports/inventory.port';
import { ORDER_PORT, type OrderPort } from '../../../../shared-kernel/application/ports/order.port';
import {
  PAYMENT_PORT,
  type PaymentPort,
} from '../../../../shared-kernel/application/ports/payment.port';
import {
  PRICING_PORT,
  type PricingPort,
  type PricingQuoteResult,
} from '../../../../shared-kernel/application/ports/pricing.port';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  CheckoutAccessDeniedError,
  CheckoutIdempotencyConflictError,
} from '../errors/checkout.errors';
import {
  CheckoutCartConflictError,
  CheckoutCouponError,
  CheckoutInventoryError,
  CheckoutValidationError,
} from '../../domain/errors/checkout.errors';
import type {
  CheckoutOutcome,
  CheckoutOrderRef,
  ShippingAddress,
} from '../../domain/checkout.types';
import {
  CHECKOUT_REPOSITORY,
  type CheckoutRepository,
} from '../ports/checkout-repository.interface';

const RESERVATION_TTL_MS = 15 * 60 * 1000;

export interface SubmitCheckoutInput {
  readonly owner: CartOwnerRef;
  readonly cartId: string;
  readonly expectedCartVersion: number;
  readonly idempotencyKey: string;
  readonly shippingAddress: ShippingAddress;
  readonly shippingMethod: string;
  readonly shippingMinor?: number;
  readonly taxRateBps?: number;
  readonly commissionRateBps?: number;
  readonly couponCode?: string;
}

@Injectable()
export class CheckoutSubmitHandler {
  constructor(
    @Inject(CHECKOUT_REPOSITORY) private readonly checkouts: CheckoutRepository,
    @Inject(CART_PORT) private readonly carts: CartPort,
    @Inject(PRICING_PORT) private readonly pricing: PricingPort,
    @Inject(INVENTORY_PORT) private readonly inventory: InventoryPort,
    @Inject(ORDER_PORT) private readonly orders: OrderPort,
    @Inject(PAYMENT_PORT) private readonly payments: PaymentPort,
  ) {}

  public async submit(input: SubmitCheckoutInput): Promise<CheckoutOutcome> {
    this.assertOwner(input.owner);
    const requestHash = hashSubmitRequest(input);

    const existing = await this.checkouts.findCompletedByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      if (existing.cartId !== input.cartId) {
        throw new CheckoutIdempotencyConflictError();
      }
      return existing;
    }

    const validation = await this.carts.validate(input.cartId, input.owner);
    if (!validation.valid) {
      throw new CheckoutValidationError('Cart validation failed.', validation.issues);
    }
    const cart = validation.cart;
    if (cart.status !== 'ACTIVE') {
      throw new CheckoutCartConflictError('Cart is not active.');
    }
    if (cart.version !== input.expectedCartVersion) {
      throw new CheckoutCartConflictError(
        `Cart version mismatch: expected ${input.expectedCartVersion}, got ${cart.version}.`,
      );
    }
    if (cart.lines.length === 0) {
      throw new CheckoutValidationError('Cart has no lines.');
    }

    const checkoutId = UniqueID.create().value;
    const byStore = groupLinesByStore(cart.lines);
    const quotes = new Map<string, PricingQuoteResult>();
    const shippingMinor = input.shippingMinor ?? 0;
    const taxRateBps = input.taxRateBps ?? 0;
    const commissionRateBps = input.commissionRateBps ?? 0;

    try {
      for (const [storeId, lines] of byStore) {
        const first = lines[0]!;
        try {
          const quote = await this.pricing.quote({
            vendorId: first.vendorId,
            storeId,
            currencyCode: first.currencyCode,
            lines: lines.map((line) => ({
              lineId: line.lineId,
              variantId: line.variantId,
              productId: line.productId,
              categoryIds: [],
              quantity: line.quantity,
              unitBasePriceMinor: line.unitPriceSnapshotMinor,
            })),
            shippingMinor: 0,
            taxRateBps,
            commissionRateBps,
            ...(input.couponCode !== undefined ? { couponCode: input.couponCode } : {}),
            ...(input.owner.customerId !== undefined ? { customerId: input.owner.customerId } : {}),
          });
          quotes.set(storeId, quote);
        } catch (error) {
          if (isPricingFailure(error)) {
            throw new CheckoutCouponError(
              error instanceof Error ? error.message : 'Promotion validation failed.',
            );
          }
          throw error;
        }
      }
    } catch (error) {
      throw error;
    }

    // Allocate shipping once on the first store quote for grand-total accounting.
    const storeIds = [...byStore.keys()];
    const primaryStoreId = storeIds[0]!;
    const primaryQuote = quotes.get(primaryStoreId)!;
    quotes.set(primaryStoreId, {
      ...primaryQuote,
      shippingMinor,
      totalMinor: primaryQuote.totalMinor - primaryQuote.shippingMinor + shippingMinor,
    });

    const reservationIds: string[] = [];
    const lineReservations = new Map<string, { reservationId: string; warehouseId: string }>();

    try {
      for (const line of cart.lines) {
        const pick = await this.inventory.pickWarehouseForReservation({
          storeId: line.storeId,
          variantId: line.variantId,
          quantity: line.quantity,
        });
        if (!pick) {
          throw new CheckoutInventoryError(
            `Insufficient inventory for variant ${line.variantId} at store ${line.storeId}.`,
          );
        }
        const reserved = await this.inventory.reserve({
          variantId: line.variantId,
          warehouseId: pick.warehouseId,
          quantity: line.quantity,
          orderId: checkoutId,
          expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
          actorUserId: input.owner.customerId ?? 'guest',
          idempotencyKey: `${input.idempotencyKey}:reserve:${line.lineId}`,
        });
        reservationIds.push(reserved.reservationId);
        lineReservations.set(line.lineId, {
          reservationId: reserved.reservationId,
          warehouseId: pick.warehouseId,
        });
      }

      const orderRefs: CheckoutOrderRef[] = [];
      let subtotalMinor = 0;
      let discountMinor = 0;
      let taxMinor = 0;
      let commissionMinor = 0;
      let grandTotalMinor = 0;
      const currencyCode = cart.currencyCode ?? cart.lines[0]!.currencyCode;

      for (const storeId of storeIds) {
        const quote = quotes.get(storeId)!;
        const lines = byStore.get(storeId)!;
        const order = await this.orders.createFromCheckout({
          checkoutId,
          idempotencyKey: `${input.idempotencyKey}:order:${storeId}`,
          customerId: cart.customerId,
          vendorId: lines[0]!.vendorId,
          storeId,
          currencyCode: quote.currencyCode,
          subtotalMinor: quote.subtotalMinor,
          discountMinor: quote.discountMinor,
          shippingMinor: quote.shippingMinor,
          taxMinor: quote.taxMinor,
          commissionMinor: quote.commissionMinor,
          totalMinor: quote.totalMinor,
          shippingMethod: input.shippingMethod,
          shippingAddress: input.shippingAddress,
          appliedPromotionId: quote.appliedPromotionId,
          appliedCouponCode: quote.appliedCouponCode,
          pricingSnapshot: quote.snapshot,
          lines: quote.lines.map((ql) => {
            const cartLine = lines.find((l) => l.lineId === ql.lineId)!;
            const reservation = lineReservations.get(ql.lineId)!;
            return {
              lineId: ql.lineId,
              vendorId: cartLine.vendorId,
              storeId: cartLine.storeId,
              productId: cartLine.productId,
              variantId: ql.variantId,
              offerId: cartLine.offerId,
              quantity: ql.quantity,
              unitPriceMinor: ql.unitSalePriceMinor,
              lineSubtotalMinor: ql.lineSubtotalMinor,
              lineDiscountMinor: ql.lineDiscountMinor,
              lineTaxMinor: ql.lineTaxMinor,
              lineTotalMinor: ql.lineTotalMinor,
              currencyCode: quote.currencyCode,
              reservationId: reservation.reservationId,
              warehouseId: reservation.warehouseId,
            };
          }),
        });
        orderRefs.push({
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          vendorId: order.vendorId,
          storeId: order.storeId,
          totalMinor: order.totalMinor,
          currencyCode: order.currencyCode,
        });
        subtotalMinor += quote.subtotalMinor;
        discountMinor += quote.discountMinor;
        taxMinor += quote.taxMinor;
        commissionMinor += quote.commissionMinor;
        grandTotalMinor += quote.totalMinor;

        if (quote.appliedPromotionId) {
          await this.pricing.recordUsage({
            promotionId: quote.appliedPromotionId,
            orderId: order.orderId,
            idempotencyKey: `${input.idempotencyKey}:promo:${quote.appliedPromotionId}:${storeId}`,
            ...(input.owner.customerId !== undefined ? { customerId: input.owner.customerId } : {}),
          });
        }
      }

      const payment = await this.payments.createIntent({
        checkoutId,
        idempotencyKey: `${input.idempotencyKey}:payment`,
        orderIds: orderRefs.map((o) => o.orderId),
        customerId: cart.customerId,
        currencyCode,
        amountMinor: grandTotalMinor,
        description: `Checkout ${checkoutId}`,
      });

      await this.carts.markCheckedOut({
        cartId: cart.cartId,
        expectedVersion: cart.version,
        owner: input.owner,
      });

      const outcome: CheckoutOutcome = {
        checkoutId,
        cartId: cart.cartId,
        cartVersion: cart.version,
        status: 'COMPLETED',
        totals: {
          subtotalMinor,
          discountMinor,
          shippingMinor,
          taxMinor,
          commissionMinor,
          grandTotalMinor,
          currencyCode,
        },
        orders: orderRefs,
        payment: {
          paymentIntentId: payment.paymentIntentId,
          amountMinor: payment.amountMinor,
          currencyCode: payment.currencyCode,
          clientSecret: payment.clientSecret,
          status: payment.status,
        },
        reservationIds,
      };

      await this.checkouts.saveCompleted({
        idempotencyKey: input.idempotencyKey,
        requestHash,
        customerId: input.owner.customerId ?? null,
        guestToken: input.owner.guestToken ?? null,
        outcome,
      });

      return outcome;
    } catch (error) {
      await this.releaseAll(
        reservationIds,
        input.owner.customerId ?? 'guest',
        input.idempotencyKey,
      );
      throw error;
    }
  }

  private async releaseAll(
    reservationIds: readonly string[],
    actorUserId: string,
    idempotencyKey: string,
  ): Promise<void> {
    for (const [index, reservationId] of reservationIds.entries()) {
      try {
        await this.inventory.release({
          reservationId,
          actorUserId,
          idempotencyKey: `${idempotencyKey}:release:${index}`,
        });
      } catch {
        // Best-effort compensation; reservations expire by TTL.
      }
    }
  }

  private assertOwner(owner: CartOwnerRef): void {
    if (!owner.customerId && !owner.guestToken) {
      throw new CheckoutAccessDeniedError();
    }
  }
}

function groupLinesByStore<T extends { readonly storeId: string }>(
  lines: readonly T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const line of lines) {
    const list = map.get(line.storeId) ?? [];
    list.push(line);
    map.set(line.storeId, list);
  }
  return map;
}

function hashSubmitRequest(input: SubmitCheckoutInput): string {
  const payload = JSON.stringify({
    cartId: input.cartId,
    expectedCartVersion: input.expectedCartVersion,
    shippingMethod: input.shippingMethod,
    shippingAddress: input.shippingAddress,
    shippingMinor: input.shippingMinor ?? 0,
    taxRateBps: input.taxRateBps ?? 0,
    commissionRateBps: input.commissionRateBps ?? 0,
    couponCode: input.couponCode ?? null,
  });
  return createHash('sha256').update(payload).digest('hex');
}

function isPricingFailure(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    String((error as { code: string }).code).startsWith('PRICING_')
  );
}
