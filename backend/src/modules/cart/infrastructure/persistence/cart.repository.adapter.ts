import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { CartRepository } from '../../application/ports/cart-repository.interface';
import type { Cart } from '../../domain/aggregates/cart.aggregate';
import { applyCartToOrm, cartLinesToOrm, cartToDomain } from './cart.mapper';
import { CartLineOrmEntity, CartOrmEntity } from './cart.orm-entity';

@Injectable()
export class CartRepositoryAdapter implements CartRepository {
  constructor(private readonly em: EntityManager) {}

  public async markCheckedOut(cartId: string, expectedVersion: number): Promise<Cart | null> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.getConnection().execute(
        `update "carts"
         set "status" = 'CHECKED_OUT',
             "version" = "version" + 1,
             "updated_at" = now()
         where "id" = ?
           and "status" = 'ACTIVE'
           and "version" = ?
         returning "id"`,
        [cartId, expectedVersion],
      );
      if (!Array.isArray(rows) || rows.length === 0) {
        return null;
      }

      const entity = await tx.findOne(CartOrmEntity, { id: cartId });
      if (!entity) {
        return null;
      }
      const lines = await tx.find(CartLineOrmEntity, { cartId });
      return cartToDomain(entity, lines);
    });
  }

  public async save(cart: Cart): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(CartOrmEntity, { id: cart.id.value });
      const entity = existing ?? new CartOrmEntity();
      applyCartToOrm(cart, entity);
      await tx.persist(entity).flush();

      const existingLines = await tx.find(CartLineOrmEntity, { cartId: cart.id.value });
      for (const line of existingLines) {
        tx.remove(line);
      }
      await tx.flush();

      for (const line of cartLinesToOrm(cart)) {
        tx.persist(line);
      }
      await tx.flush();
    });
  }

  public async findById(id: string): Promise<Cart | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(CartOrmEntity, { id });
      if (!entity) {
        return null;
      }
      const lines = await tx.find(CartLineOrmEntity, { cartId: id });
      return cartToDomain(entity, lines);
    });
  }

  public async findActiveByCustomerId(customerId: string): Promise<Cart | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(CartOrmEntity, {
        customerId,
        status: 'ACTIVE',
      });
      if (!entity) {
        return null;
      }
      const lines = await tx.find(CartLineOrmEntity, { cartId: entity.id });
      return cartToDomain(entity, lines);
    });
  }

  public async findActiveByGuestToken(guestToken: string): Promise<Cart | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(CartOrmEntity, {
        guestToken,
        status: 'ACTIVE',
      });
      if (!entity) {
        return null;
      }
      const lines = await tx.find(CartLineOrmEntity, { cartId: entity.id });
      return cartToDomain(entity, lines);
    });
  }
}
