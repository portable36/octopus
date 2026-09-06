import type { Register } from '../../domain/aggregates/register.aggregate';

export const REGISTER_REPOSITORY = Symbol('REGISTER_REPOSITORY');

export interface RegisterRepository {
  save(register: Register): Promise<void>;
  findById(id: string): Promise<Register | null>;
  findByStoreId(storeId: string): Promise<readonly Register[]>;
  findByStoreAndCode(storeId: string, code: string): Promise<Register | null>;
}
