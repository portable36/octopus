import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type {
  CompletedOrderBasketsPort,
  OrderProductBasket,
} from '../../application/ports/completed-order-baskets.port';

type OrderLineRow = {
  order_id: string;
  product_id: string;
};

@Injectable()
export class CompletedOrderBasketsAdapter implements CompletedOrderBasketsPort {
  constructor(private readonly em: EntityManager) {}

  public async listRecentBaskets(options: {
    readonly since: Date;
    readonly limit: number;
  }): Promise<readonly OrderProductBasket[]> {
    const capped = Math.min(Math.max(options.limit, 1), 20_000);
    const rows = await this.em.getConnection().execute<OrderLineRow[]>(
      `
        select o.id as order_id, ol.product_id
        from orders o
        inner join order_lines ol on ol.order_id = o.id
        where o.payment_status = 'PAID'
          and o.status not in ('CANCELLED', 'PAYMENT_FAILED', 'RETURNED')
          and o.created_at >= ?
        order by o.created_at desc
        limit ?
      `,
      [options.since, capped * 20],
    );

    const productsByOrder = new Map<string, Set<string>>();
    for (const row of rows) {
      const bucket = productsByOrder.get(row.order_id) ?? new Set<string>();
      bucket.add(row.product_id);
      productsByOrder.set(row.order_id, bucket);
    }

    const baskets: OrderProductBasket[] = [];
    for (const [orderId, productIds] of productsByOrder) {
      if (baskets.length >= capped) {
        break;
      }
      baskets.push({
        orderId,
        productIds: [...productIds],
      });
    }

    return baskets;
  }
}
