import type { OutboxRow, OutboxSource } from '../../domain/outbox.types';

export const OUTBOX_STORE = Symbol('OUTBOX_STORE');

export interface OutboxStore {
  claimUnpublished(batchSize: number, maxRetries: number): Promise<OutboxRow[]>;
  markPublished(source: OutboxSource, id: string): Promise<void>;
  markDispatchFailure(source: OutboxSource, id: string): Promise<void>;
}
