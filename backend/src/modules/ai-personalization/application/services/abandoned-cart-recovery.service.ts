import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Promotion } from '../../../pricing/domain/aggregates/promotion.aggregate';
import {
  PROMOTION_REPOSITORY,
  type PromotionRepository,
} from '../../../pricing/application/ports/promotion-repository.interface';
import {
  CART_REPOSITORY,
  type CartRepository,
} from '../../../cart/application/ports/cart-repository.interface';
import type { AbandonedCartOutboxHandler } from '../../../../shared-kernel/application/ports/abandoned-cart-outbox-handler.port';
import type { AbandonedCartRecoveryPort } from '../../../../shared-kernel/application/ports/abandoned-cart-recovery.port';
import {
  ABANDONED_CART_COUPON_TTL_MS,
  ABANDONED_CART_DISCOUNT_PERCENT,
  type CartAbandonedEventPayload,
  generateRecoveryCouponCode,
} from '../abandoned-cart.types';
import { CartAbandonedOutboxPublisher } from '../../infrastructure/persistence/cart-abandoned-outbox.publisher';
import { AbandonedCartSchedulerService } from '../../jobs/abandoned-cart-scheduler.service';

const PURCHASE_CANCEL_EVENTS = new Set(['OrderCreated', 'OrderPaid', 'PaymentProcessed']);

@Injectable()
export class AbandonedCartRecoveryService
  implements AbandonedCartRecoveryPort, AbandonedCartOutboxHandler
{
  private readonly logger = new Logger(AbandonedCartRecoveryService.name);

  constructor(
    @Inject(forwardRef(() => AbandonedCartSchedulerService))
    private readonly scheduler: AbandonedCartSchedulerService,
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
    @Inject(PROMOTION_REPOSITORY) private readonly promotions: PromotionRepository,
    @Inject(forwardRef(() => CartAbandonedOutboxPublisher))
    private readonly outboxPublisher: CartAbandonedOutboxPublisher,
    @Inject(EntityManager) private readonly em: EntityManager,
  ) {}

  public async onCartUpdated(cartId: string): Promise<void> {
    const cart = await this.carts.findById(cartId);
    if (!cart || cart.status !== 'ACTIVE' || cart.lines.length === 0) {
      await this.scheduler.cancelCartCheck(cartId);
      return;
    }
    await this.scheduler.scheduleCartCheck(cartId);
  }

  public async cancelForCart(cartId: string): Promise<void> {
    await this.scheduler.cancelCartCheck(cartId);
  }

  public async onPurchaseCompleted(input: { readonly orderId: string }): Promise<void> {
    const cartId = await this.resolveCartIdForOrder(input.orderId);
    if (!cartId) {
      return;
    }
    await this.scheduler.cancelCartCheck(cartId);
  }

  public async handle(eventType: string, payload: Record<string, unknown>): Promise<void> {
    if (!PURCHASE_CANCEL_EVENTS.has(eventType)) {
      return;
    }
    const orderId = String(payload['orderId'] ?? '');
    if (!orderId) {
      return;
    }
    await this.onPurchaseCompleted({ orderId });
  }

  public async processAbandonedCart(cartId: string): Promise<void> {
    const cart = await this.carts.findById(cartId);
    if (!cart || cart.status !== 'ACTIVE' || cart.lines.length === 0) {
      this.logger.debug(`Cart ${cartId} no longer abandoned-eligible; skip recovery.`);
      return;
    }

    const firstLine = cart.lines[0]!;
    const couponCode = generateRecoveryCouponCode();
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + ABANDONED_CART_COUPON_TTL_MS);

    const promotion = Promotion.create({
      vendorId: firstLine.vendorId,
      storeId: firstLine.storeId,
      name: 'Abandoned cart recovery',
      couponCode,
      discountType: 'PERCENTAGE',
      discountValue: ABANDONED_CART_DISCOUNT_PERCENT,
      currencyCode: firstLine.currencyCode,
      scope: 'STORE',
      usageLimit: 1,
      perCustomerLimit: 1,
      startsAt,
      endsAt,
    });
    promotion.activate();
    await this.promotions.save(promotion);

    const subtotalMinor = cart.lines.reduce(
      (sum, line) => sum + line.unitPriceSnapshotMinor * line.quantity,
      0,
    );

    const eventPayload: CartAbandonedEventPayload = {
      cartId: cart.id.value,
      customerId: cart.customerId,
      guestToken: cart.guestToken,
      couponCode,
      couponExpiresAt: endsAt.toISOString(),
      currencyCode: cart.currencyCode ?? firstLine.currencyCode,
      subtotalMinor,
      items: cart.lineSnapshots().map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        offerId: line.offerId,
        quantity: line.quantity,
        unitPriceSnapshotMinor: line.unitPriceSnapshotMinor,
      })),
    };

    await this.outboxPublisher.publish(cart.id.value, eventPayload);
    this.logger.log(`Dispatched CartAbandonedEvent for cart ${cartId}.`);
  }

  private async resolveCartIdForOrder(orderId: string): Promise<string | null> {
    const rows = await this.em.getConnection().execute<{ cart_id: string }[]>(
      `
        select cs.cart_id
        from orders o
        inner join checkout_submissions cs on cs.id = o.checkout_id
        where o.id = ?
        limit 1
      `,
      [orderId],
    );
    return rows[0]?.cart_id ?? null;
  }
}
