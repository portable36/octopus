import type { Shift } from '../../domain/aggregates/shift.aggregate';

export const SHIFT_REPOSITORY = Symbol('SHIFT_REPOSITORY');

export interface ShiftRepository {
  findById(id: string): Promise<Shift | null>;
  findActiveByRegisterId(registerId: string): Promise<Shift | null>;
  findLatestByRegisterId(registerId: string): Promise<Shift | null>;
  findByStoreId(storeId: string, limit?: number): Promise<readonly Shift[]>;
  findActiveByStoreId(storeId: string): Promise<readonly Shift[]>;
  save(shift: Shift): Promise<void>;
}
