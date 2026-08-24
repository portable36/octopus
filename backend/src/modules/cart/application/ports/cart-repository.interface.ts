import type { Cart } from '../../domain/aggregates/cart.aggregate';

export const CART_REPOSITORY = Symbol('CART_REPOSITORY');

export interface CartRepository {
  save(cart: Cart): Promise<void>;
  findById(id: string): Promise<Cart | null>;
  findActiveByCustomerId(customerId: string): Promise<Cart | null>;
  findActiveByGuestToken(guestToken: string): Promise<Cart | null>;
}
