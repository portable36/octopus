import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
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
  type PaymentMethodDto,
  type PaymentPort,
} from '../../../../shared-kernel/application/ports/payment.port';
import {
  PRICING_PORT,
  type PricingPort,
  type PricingQuoteResult,
} from '../../../../shared-kernel/application/ports/pricing.port';
import {
  STORE_ACCESS,
  type StoreAccessPort,
} from '../../../../shared-kernel/application/ports/store-access.port';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
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
  CheckoutPaymentRef,
  ShippingAddress,
} from '../../domain/checkout.types';
import {
  CHECKOUT_REPOSITORY,
  type CheckoutRepository,
} from '../ports/checkout-repository.interface';

const GATEWAY_RESERVATION_TTL_MS = 15 * 60 * 1000;

export interface SubmitCheckoutInput {
  readonly owner: CartOwnerRef;
  readonly cartId: string;
  readonly expectedCartVersion: number;
  readonly idempotencyKey: string;
  readonly paymentMethod: PaymentMethodDto;
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
    @Inject(STORE_ACCESS) private readonly stores: StoreAccessPort,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
    private readonly config: AppConfigService,
  ) {}

  public async submit(input: SubmitCheckoutInput): Promise<CheckoutOutcome> {
    this.assertOwner(input.owner);
    this.assertShippingAddress(input.shippingAddress);
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
    const reservationTtlMs = await this.resolveReservationTtlMs(input.paymentMethod, byStore);

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

    const storeIds = [...byStore.keys()];
    const primaryStoreId = storeIds[0]!;
    const primaryQuote = quotes.get(primaryStoreId)!;
    quotes.set(primaryStoreId, {
      ...primaryQuote,
      shippingMinor,
      totalMinor: primaryQuote.totalMinor - primaryQuote.shippingMinor + shippingMinor,
    });

    if (input.paymentMethod === 'COD') {
      await this.assertCodEligibility(byStore, quotes);
    }

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
          expiresAt: new Date(Date.now() + reservationTtlMs),
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
      const paymentRefs: CheckoutPaymentRef[] = [];
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
          paymentMethod: input.paymentMethod,
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
          paymentMethod: input.paymentMethod,
          paymentStatus: 'PENDING',
        });

        const payment = await this.payments.createIntent({
          checkoutId,
          orderId: order.orderId,
          vendorId: order.vendorId,
          storeId: order.storeId,
          idempotencyKey: `${input.idempotencyKey}:payment:${order.orderId}`,
          customerId: cart.customerId,
          currencyCode: order.currencyCode,
          amountMinor: order.totalMinor,
          paymentMethod: input.paymentMethod,
          ...(input.paymentMethod === 'COD'
            ? { expiresAt: new Date(Date.now() + reservationTtlMs) }
            : {}),
          description: `Order ${order.orderNumber}`,
        });
        paymentRefs.push({
          paymentIntentId: payment.paymentIntentId,
          orderId: order.orderId,
          paymentMethod: payment.paymentMethod,
          amountMinor: payment.amountMinor,
          currencyCode: payment.currencyCode,
          status: payment.status,
          ...(payment.clientSecret !== undefined ? { clientSecret: payment.clientSecret } : {}),
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
        paymentMethod: input.paymentMethod,
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
        payments: paymentRefs,
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

  private async resolveReservationTtlMs(
    paymentMethod: PaymentMethodDto,
    byStore: Map<string, readonly { readonly vendorId: string; readonly storeId: string }[]>,
  ): Promise<number> {
    if (paymentMethod !== 'COD') {
      return GATEWAY_RESERVATION_TTL_MS;
    }
    let hours = this.config.codReservationTtlHours;
    for (const [storeId, lines] of byStore) {
      const store = await this.stores.findById(storeId);
      const vendor = await this.vendors.findById(lines[0]!.vendorId);
      const storeHours = store?.codReservationTtlHours;
      const vendorHours = vendor?.codReservationTtlHours;
      hours = Math.max(hours, storeHours ?? 0, vendorHours ?? 0);
    }
    return hours * 60 * 60 * 1000;
  }

  private async assertCodEligibility(
    byStore: Map<string, readonly { readonly vendorId: string; readonly storeId: string }[]>,
    quotes: Map<string, PricingQuoteResult>,
  ): Promise<void> {
    for (const [storeId, lines] of byStore) {
      const store = await this.stores.findById(storeId);
      const vendor = await this.vendors.findById(lines[0]!.vendorId);
      if (!store || !vendor) {
        throw new CheckoutValidationError('Store or vendor not found for COD eligibility.', [
          { code: 'COD_NOT_AVAILABLE', message: 'Store or vendor missing.' },
        ]);
      }
      const enabled = store.codEnabled && vendor.codEnabled;
      if (!enabled) {
        throw new CheckoutValidationError('Cash on delivery is not available for this store.', [
          { code: 'COD_NOT_AVAILABLE', message: `COD disabled for store ${storeId}.` },
        ]);
      }

      const quote = quotes.get(storeId)!;
      const minAmount = Math.max(
        store.codMinAmountMinor,
        vendor.codMinAmountMinor,
        this.config.codMinAmountMinor,
      );
      const maxCandidates = [
        store.codMaxAmountMinor,
        vendor.codMaxAmountMinor,
        this.config.codMaxAmountMinor,
      ].filter((value): value is number => value !== null && value !== undefined);
      const maxAmount = maxCandidates.length > 0 ? Math.min(...maxCandidates) : null;

      if (quote.totalMinor < minAmount) {
        throw new CheckoutValidationError('Order total is below the COD minimum.', [
          {
            code: 'COD_AMOUNT_BELOW_MIN',
            message: `Minimum COD amount is ${minAmount} minor units.`,
          },
        ]);
      }
      if (maxAmount !== null && quote.totalMinor > maxAmount) {
        throw new CheckoutValidationError('Order total exceeds the COD maximum.', [
          {
            code: 'COD_AMOUNT_ABOVE_MAX',
            message: `Maximum COD amount is ${maxAmount} minor units.`,
          },
        ]);
      }

      const expectedCurrency = store.currencyCode || vendor.currencyCode;
      if (quote.currencyCode !== expectedCurrency) {
        throw new CheckoutValidationError('Currency mismatch for COD checkout.', [
          { code: 'COD_CURRENCY_MISMATCH', message: `Expected ${expectedCurrency}.` },
        ]);
      }
    }
  }

  private assertShippingAddress(address: ShippingAddress): void {
    if (!address.line1?.trim() || !address.city?.trim() || !address.countryCode?.trim()) {
      throw new CheckoutValidationError('Shipping address is required.', [
        {
          code: 'SHIPPING_ADDRESS_REQUIRED',
          message: 'line1, city, and countryCode are required.',
        },
      ]);
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
    paymentMethod: input.paymentMethod,
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
