import { Inject, Injectable } from '@nestjs/common';
import {
  CART_PORT,
  type CartOwnerRef,
  type CartPort,
  type CartSnapshotDto,
  type CartValidationIssueDto,
} from '../../../../shared-kernel/application/ports/cart.port';
import { CartCommandHandler } from '../../application/commands/cart.handlers';
import type { Cart } from '../../domain/aggregates/cart.aggregate';

@Injectable()
export class CartPortAdapter implements CartPort {
  constructor(@Inject(CartCommandHandler) private readonly carts: CartCommandHandler) {}

  public async getOwnedCart(cartId: string, owner: CartOwnerRef): Promise<CartSnapshotDto> {
    const cart = await this.carts.get(cartId, owner);
    return this.toSnapshot(cart);
  }

  public async validate(
    cartId: string,
    owner: CartOwnerRef,
  ): Promise<{
    readonly cart: CartSnapshotDto;
    readonly issues: readonly CartValidationIssueDto[];
    readonly valid: boolean;
  }> {
    const result = await this.carts.validate({ cartId, owner });
    return {
      cart: this.toSnapshot(result.cart),
      valid: result.valid,
      issues: result.issues.map((issue) => ({
        lineId: issue.lineId,
        code: issue.code,
        message: issue.message,
        ...(issue.currentPriceMinor !== undefined
          ? { currentPriceMinor: issue.currentPriceMinor }
          : {}),
        ...(issue.availableQuantity !== undefined
          ? { availableQuantity: issue.availableQuantity }
          : {}),
      })),
    };
  }

  public async markCheckedOut(input: {
    readonly cartId: string;
    readonly expectedVersion: number;
    readonly owner: CartOwnerRef;
  }): Promise<CartSnapshotDto> {
    const cart = await this.carts.markCheckedOut(input);
    return this.toSnapshot(cart);
  }

  private toSnapshot(cart: Cart): CartSnapshotDto {
    return {
      cartId: cart.id.value,
      customerId: cart.customerId,
      guestToken: cart.guestToken,
      currencyCode: cart.currencyCode,
      status: cart.status,
      version: cart.version,
      lines: cart.lineSnapshots(),
    };
  }
}

export { CART_PORT };
