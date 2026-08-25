import type { ReturnRequest } from '../../domain/aggregates/return-request.aggregate';
import type { ReturnStatus } from '../../domain/returns.types';

export const RETURNS_REPOSITORY = Symbol('RETURNS_REPOSITORY');

export type ReturnLineQuantityRow = {
  readonly orderItemId: string;
  readonly quantity: number;
  readonly status: ReturnStatus;
};

export interface ReturnsRepository {
  findById(id: string): Promise<ReturnRequest | null>;
  listByOrderId(orderId: string): Promise<ReturnRequest[]>;
  listByStoreId(storeId: string): Promise<ReturnRequest[]>;
  listQuantityRowsByOrderId(orderId: string): Promise<ReturnLineQuantityRow[]>;
  save(returnRequest: ReturnRequest): Promise<void>;
  findOperation(
    idempotencyKey: string,
  ): Promise<{ requestHash: string; responseJson: Record<string, unknown> } | null>;
  saveOperation(input: {
    readonly idempotencyKey: string;
    readonly operationType: string;
    readonly requestHash: string;
    readonly responseJson: Record<string, unknown>;
  }): Promise<void>;
}
