import { Inject, Injectable } from '@nestjs/common';
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
    if (!offer || offer.status !== 'active' || !offer.isAvailable) {
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
    await this.carts.save(cart);
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
    await this.carts.save(cart);
    return cart;
  }

  public async removeItem(input: {
    readonly cartId: string;
    readonly owner: CartOwner;
    readonly lineId: string;
  }): Promise<Cart> {
    const cart = await this.requireOwnedCart(input.cartId, input.owner);
    cart.removeItem(input.lineId);
    await this.carts.save(cart);
    return cart;
  }

  public async clear(input: { readonly cartId: string; readonly owner: CartOwner }): Promise<Cart> {
    const cart = await this.requireOwnedCart(input.cartId, input.owner);
    cart.clear();
    await this.carts.save(cart);
    return cart;
  }

  public async validate(input: { readonly cartId: string; readonly owner: CartOwner }): Promise<{
    readonly cart: Cart;
    readonly issues: CartValidationIssue[];
    readonly valid: boolean;
  }> {
    const cart = await this.requireOwnedCart(input.cartId, input.owner);
    const issues: CartValidationIssue[] = [];

    for (const line of cart.lines) {
      const offer = await this.offers.findByStoreAndVariant(line.storeId, line.variantId);
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
      if (offer.status !== 'active' || !offer.isAvailable) {
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

    const quotesByStore: Record<string, PricingQuoteResult> = {};
    let displaySubtotalMinor = 0;
    let displayDiscountMinor = 0;
    let displayTotalMinor = 0;

    for (const [storeId, lines] of byStore) {
      const first = lines[0]!;
      const quoteLines = [];
      for (const line of lines) {
        const offer = await this.offers.findByStoreAndVariant(line.storeId, line.variantId);
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
      await this.carts.save(cart);
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
    cart.markCheckedOut(input.expectedVersion);
    await this.carts.save(cart);
    return cart;
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
    await this.carts.save(customerCart);
    guest.abandon();
    await this.carts.save(guest);
    return customerCart;
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
