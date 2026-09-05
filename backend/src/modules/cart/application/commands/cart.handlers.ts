import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  ABANDONED_CART_RECOVERY_PORT,
  type AbandonedCartRecoveryPort,
} from '../../../../shared-kernel/application/ports/abandoned-cart-recovery.port';
import {
  CATALOG_STORE_OFFER_ACCESS,
  type CatalogStoreOfferAccessPort,
} from '../../../../shared-kernel/application/ports/catalog-store-offer-access.port';
import {
  INVENTORY_PORT,
  type InventoryPort,
} from '../../../../shared-kernel/application/ports/inventory.port';
import {
  PRICING_PORT,
  type PricingPort,
  type PricingQuoteResult,
} from '../../../../shared-kernel/application/ports/pricing.port';
import { Cart } from '../../domain/aggregates/cart.aggregate';
import type { CartLineProps } from '../../domain/aggregates/cart.aggregate';
import type { CartValidationIssue } from '../../domain/cart.types';
import { CartDomainError } from '../../domain/errors/cart.errors';
import {
  CartAccessDeniedError,
  CartNotFoundError,
  CartOfferUnavailableError,
} from '../errors/cart.errors';
import { CART_REPOSITORY, type CartRepository } from '../ports/cart-repository.interface';

export interface CartOwner {
  readonly customerId?: string;
  readonly guestToken?: string;
  readonly actorRoles?: readonly string[];
}

@Injectable()
export class CartCommandHandler {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
    @Inject(CATALOG_STORE_OFFER_ACCESS) private readonly offers: CatalogStoreOfferAccessPort,
    @Inject(INVENTORY_PORT) private readonly inventory: InventoryPort,
    @Inject(PRICING_PORT) private readonly pricing: PricingPort,
    @Optional()
    @Inject(ABANDONED_CART_RECOVERY_PORT)
    private readonly abandonedCartRecovery?: AbandonedCartRecoveryPort,
  ) {}

  public async getOrCreate(owner: CartOwner): Promise<Cart> {
    this.assertOwner(owner);
    if (owner.customerId) {
      const existing = await this.carts.findActiveByCustomerId(owner.customerId);
      if (existing) {
        return existing;
      }
      const cart = Cart.create({ customerId: owner.customerId });
      await this.carts.save(cart);
      return cart;
    }
    const existing = await this.carts.findActiveByGuestToken(owner.guestToken!);
    if (existing) {
      return existing;
    }
    const cart = Cart.create({ guestToken: owner.guestToken! });
    await this.carts.save(cart);
    return cart;
  }

  public async get(cartId: string, owner: CartOwner): Promise<Cart> {
    const cart = await this.requireOwnedCart(cartId, owner);
    return cart;
  }

  public async addItem(input: {
    readonly cartId: string;
    readonly owner: CartOwner;
    readonly storeId: string;
    readonly variantId: string;
    readonly quantity: number;
  }): Promise<Cart> {
    const cart = await this.requireOwnedCart(input.cartId, input.owner);
    const offer = await this.offers.findByStoreAndVariant(input.storeId, input.variantId);
    if (!offer || !offer.isSellable) {
      throw new CartOfferUnavailableError();
    }
    cart.addItem({
      vendorId: offer.vendorId,
      storeId: offer.storeId,
      productId: offer.productId,
      variantId: offer.variantId,
      offerId: offer.offerId,
      quantity: input.quantity,
      unitPriceSnapshotMinor: offer.priceMinor,
      currencyCode: offer.currencyCode,
    });
    await this.persistCart(cart);
    return cart;
  }

  public async updateQuantity(input: {
    readonly cartId: string;
    readonly owner: CartOwner;
    readonly lineId: string;
    readonly quantity: number;
  }): Promise<Cart> {
    const cart = await this.requireOwnedCart(input.cartId, input.owner);
    cart.updateQuantity(input.lineId, input.quantity);
    await this.persistCart(cart);
    return cart;
  }

  public async removeItem(input: {
    readonly cartId: string;
    readonly owner: CartOwner;
    readonly lineId: string;
  }): Promise<Cart> {
    const cart = await this.requireOwnedCart(input.cartId, input.owner);
    cart.removeItem(input.lineId);
    await this.persistCart(cart);
    return cart;
  }

  public async clear(input: { readonly cartId: string; readonly owner: CartOwner }): Promise<Cart> {
    const cart = await this.requireOwnedCart(input.cartId, input.owner);
    cart.clear();
    await this.persistCart(cart);
    return cart;
  }

  public async validate(input: { readonly cartId: string; readonly owner: CartOwner }): Promise<{
    readonly cart: Cart;
    readonly issues: CartValidationIssue[];
    readonly valid: boolean;
  }> {
    const cart = await this.requireOwnedCart(input.cartId, input.owner);
    const issues: CartValidationIssue[] = [];
    const offerSnapshots = await this.offers.findManyByStoreAndVariant(
      cart.lines.map((line) => ({ storeId: line.storeId, variantId: line.variantId })),
    );
    const offersByPair = new Map(
      offerSnapshots.map((offer) => [`${offer.storeId}:${offer.variantId}`, offer] as const),
    );

    for (const line of cart.lines) {
      const offer = offersByPair.get(`${line.storeId}:${line.variantId}`);
      if (!offer) {
        issues.push({
          lineId: line.lineId,
          code: 'OFFER_MISSING',
          message: 'Store offer no longer exists.',
        });
        continue;
      }
      if (offer.vendorId !== line.vendorId || offer.storeId !== line.storeId) {
        issues.push({
          lineId: line.lineId,
          code: 'VENDOR_ISOLATION',
          message: 'Offer ownership no longer matches the cart line.',
        });
        continue;
      }
      if (!offer.isSellable) {
        issues.push({
          lineId: line.lineId,
          code: 'OFFER_UNAVAILABLE',
          message: 'Store offer is not available for sale.',
        });
      }
      if (offer.currencyCode !== line.currencyCode) {
        issues.push({
          lineId: line.lineId,
          code: 'CURRENCY_MISMATCH',
          message: 'Offer currency changed.',
        });
      }
      if (offer.priceMinor !== line.unitPriceSnapshotMinor) {
        issues.push({
          lineId: line.lineId,
          code: 'PRICE_CHANGED',
          message: 'Offer price changed since the cart snapshot.',
          currentPriceMinor: offer.priceMinor,
        });
      }

      const stock = await this.inventory.checkStoreAvailability({
        storeId: line.storeId,
        variantId: line.variantId,
      });
      if (stock.status === 'MISSING') {
        issues.push({
          lineId: line.lineId,
          code: 'INVENTORY_MISSING',
          message: 'No inventory record for this store offer.',
          availableQuantity: 0,
        });
      } else if (stock.available < line.quantity) {
        issues.push({
          lineId: line.lineId,
          code: 'INSUFFICIENT_STOCK',
          message: 'Requested quantity exceeds available inventory.',
          availableQuantity: stock.available,
        });
      }
    }

    return { cart, issues, valid: issues.length === 0 };
  }

  public async recalculate(input: {
    readonly cartId: string;
    readonly owner: CartOwner;
    readonly couponCode?: string;
    readonly refreshSnapshots?: boolean;
  }): Promise<{
    readonly cart: Cart;
    readonly quotesByStore: Record<string, PricingQuoteResult>;
    readonly displaySubtotalMinor: number;
    readonly displayDiscountMinor: number;
    readonly displayTotalMinor: number;
  }> {
    const cart = await this.requireOwnedCart(input.cartId, input.owner);
    const byStore = new Map<string, CartLineProps[]>();
    for (const line of cart.lines) {
      const list = byStore.get(line.storeId) ?? [];
      list.push(line);
      byStore.set(line.storeId, list);
    }

    const offerSnapshots = await this.offers.findManyByStoreAndVariant(
      cart.lines.map((line) => ({ storeId: line.storeId, variantId: line.variantId })),
    );
    const offersByPair = new Map(
      offerSnapshots.map((offer) => [`${offer.storeId}:${offer.variantId}`, offer] as const),
    );

    const quotesByStore: Record<string, PricingQuoteResult> = {};
    let displaySubtotalMinor = 0;
    let displayDiscountMinor = 0;
    let displayTotalMinor = 0;

    for (const [storeId, lines] of byStore) {
      const first = lines[0]!;
      const quoteLines = [];
      for (const line of lines) {
        const offer = offersByPair.get(`${line.storeId}:${line.variantId}`);
        const unitBase = offer?.priceMinor ?? line.unitPriceSnapshotMinor;
        if (input.refreshSnapshots && offer) {
          cart.refreshLinePriceSnapshot(line.lineId, offer.priceMinor);
        }
        quoteLines.push({
          lineId: line.lineId,
          variantId: line.variantId,
          productId: line.productId,
          categoryIds: [] as string[],
          quantity: line.quantity,
          unitBasePriceMinor: unitBase,
        });
      }

      const quote = await this.pricing.quote({
        vendorId: first.vendorId,
        storeId,
        currencyCode: first.currencyCode,
        lines: quoteLines,
        ...(input.couponCode !== undefined ? { couponCode: input.couponCode } : {}),
        ...(input.owner.customerId !== undefined ? { customerId: input.owner.customerId } : {}),
      });
      quotesByStore[storeId] = quote;
      displaySubtotalMinor += quote.subtotalMinor;
      displayDiscountMinor += quote.discountMinor;
      displayTotalMinor += quote.totalMinor;
    }

    if (input.refreshSnapshots) {
      await this.persistCart(cart);
    }

    return {
      cart,
      quotesByStore,
      displaySubtotalMinor,
      displayDiscountMinor,
      displayTotalMinor,
    };
  }

  public async markCheckedOut(input: {
    readonly cartId: string;
    readonly expectedVersion: number;
    readonly owner: CartOwner;
  }): Promise<Cart> {
    const cart = await this.requireOwnedCart(input.cartId, input.owner);
    const checkedOut = await this.carts.markCheckedOut(cart.id.value, input.expectedVersion);
    if (!checkedOut) {
      throw new CartDomainError(
        'Cart version conflict or cart is no longer active.',
        'CART_VERSION_CONFLICT',
      );
    }
    await this.abandonedCartRecovery?.cancelForCart(checkedOut.id.value);
    return checkedOut;
  }

  /**
   * Merge guest cart lines into the authenticated customer's active cart, then abandon the guest cart.
   */
  public async mergeGuestCart(input: {
    readonly customerId: string;
    readonly guestToken: string;
  }): Promise<Cart> {
    const guestToken = input.guestToken.trim();
    if (guestToken.length < 8) {
      throw new CartAccessDeniedError();
    }
    const guest = await this.carts.findActiveByGuestToken(guestToken);
    const customerCart = await this.getOrCreate({ customerId: input.customerId });
    if (!guest || guest.id.value === customerCart.id.value) {
      return customerCart;
    }
    for (const line of guest.lines) {
      customerCart.addItem({
        vendorId: line.vendorId,
        storeId: line.storeId,
        productId: line.productId,
        variantId: line.variantId,
        offerId: line.offerId,
        quantity: line.quantity,
        unitPriceSnapshotMinor: line.unitPriceSnapshotMinor,
        currencyCode: line.currencyCode,
      });
    }
    await this.persistCart(customerCart);
    guest.abandon();
    await this.carts.save(guest);
    await this.abandonedCartRecovery?.cancelForCart(guest.id.value);
    return customerCart;
  }

  private async persistCart(cart: Cart): Promise<void> {
    await this.carts.save(cart);
    await this.abandonedCartRecovery?.onCartUpdated(cart.id.value);
  }

  private assertOwner(owner: CartOwner): void {
    if (!owner.customerId && !owner.guestToken) {
      throw new CartAccessDeniedError();
    }
  }

  private async requireOwnedCart(cartId: string, owner: CartOwner): Promise<Cart> {
    this.assertOwner(owner);
    const cart = await this.carts.findById(cartId);
    if (!cart) {
      throw new CartNotFoundError();
    }
    if (owner.actorRoles?.includes('PLATFORM_ADMIN')) {
      return cart;
    }
    if (owner.customerId && cart.customerId === owner.customerId) {
      return cart;
    }
    if (owner.guestToken && cart.guestToken === owner.guestToken) {
      return cart;
    }
    throw new CartAccessDeniedError();
  }
}
