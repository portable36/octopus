import type { Shipment } from '../../domain/aggregates/shipment.aggregate';

export const FULFILLMENT_REPOSITORY = Symbol('FULFILLMENT_REPOSITORY');

export interface FulfillmentRepository {
  findById(id: string): Promise<Shipment | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<Shipment | null>;
  save(shipment: Shipment, idempotencyKey: string): Promise<void>;
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
