export const CART_PORT = Symbol('CART_PORT');

export interface CartOwnerRef {
  readonly customerId?: string;
  readonly guestToken?: string;
  readonly actorRoles?: readonly string[];
}

export interface CartLineSnapshotDto {
  readonly lineId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly productId: string;
  readonly variantId: string;
  readonly offerId: string;
  readonly quantity: number;
  readonly unitPriceSnapshotMinor: number;
  readonly currencyCode: string;
}

export interface CartSnapshotDto {
  readonly cartId: string;
  readonly customerId: string | null;
  readonly guestToken: string | null;
  readonly currencyCode: string | null;
  readonly status: string;
  readonly version: number;
  readonly lines: readonly CartLineSnapshotDto[];
}

export interface CartValidationIssueDto {
  readonly lineId: string;
  readonly code: string;
  readonly message: string;
  readonly currentPriceMinor?: number;
  readonly availableQuantity?: number;
}

export interface CartPort {
  getOwnedCart(cartId: string, owner: CartOwnerRef): Promise<CartSnapshotDto>;
  validate(
    cartId: string,
    owner: CartOwnerRef,
  ): Promise<{
    readonly cart: CartSnapshotDto;
    readonly issues: readonly CartValidationIssueDto[];
    readonly valid: boolean;
  }>;
  markCheckedOut(input: {
    readonly cartId: string;
    readonly expectedVersion: number;
    readonly owner: CartOwnerRef;
  }): Promise<CartSnapshotDto>;
}
