export const ABANDONED_CART_RECOVERY_PORT = Symbol('ABANDONED_CART_RECOVERY_PORT');

/** Cart → marketing automation seam (schedule/cancel delayed recovery jobs). */
export interface AbandonedCartRecoveryPort {
  onCartUpdated(cartId: string): Promise<void>;
  cancelForCart(cartId: string): Promise<void>;
  onPurchaseCompleted(input: { readonly orderId: string }): Promise<void>;
}
