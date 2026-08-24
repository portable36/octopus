import type { Order } from '../../domain/aggregates/order.aggregate';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<Order | null>;
  listByCustomerId(customerId: string): Promise<Order[]>;
  listByStoreId(storeId: string): Promise<Order[]>;
}
