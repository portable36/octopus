import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import type { CartAbandonedEventPayload } from '../../application/abandoned-cart.types';

@Injectable()
export class CartAbandonedOutboxPublisher {
  constructor(private readonly em: EntityManager) {}

  public async publish(cartId: string, payload: CartAbandonedEventPayload): Promise<void> {
    await this.em.getConnection().execute(
      `
        insert into order_outbox (
          id,
          aggregate_id,
          event_type,
          payload_json,
          event_version,
          created_at,
          published_at,
          retry_count
        ) values (?, ?, ?, ?::jsonb, 1, now(), null, 0)
      `,
      [randomUUID(), cartId, 'CartAbandonedEvent', JSON.stringify(payload)],
    );
  }
}
