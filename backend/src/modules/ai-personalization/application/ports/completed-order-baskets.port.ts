export const COMPLETED_ORDER_BASKETS_PORT = Symbol('COMPLETED_ORDER_BASKETS_PORT');

export type OrderProductBasket = {
  readonly orderId: string;
  readonly productIds: readonly string[];
};

export interface CompletedOrderBasketsPort {
  /** Recent paid orders with distinct product ids per basket. */
  listRecentBaskets(options: {
    readonly since: Date;
    readonly limit: number;
  }): Promise<readonly OrderProductBasket[]>;
}
