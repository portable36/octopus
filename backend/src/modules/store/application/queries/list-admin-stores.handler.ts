import { Inject, Injectable } from '@nestjs/common';
import { StoreAccessDeniedError } from '../errors/store.errors';
import { STORE_REPOSITORY, type StoreRepository } from '../ports/store-repository.interface';
import type {
  AdminStoreListQuery,
  AdminStoreListResult,
  AdminStoreStats,
} from './admin-store-list.types';

function isPlatformAdmin(roles: readonly string[]): boolean {
  return roles.includes('PLATFORM_ADMIN');
}

@Injectable()
export class ListAdminStoresHandler {
  constructor(@Inject(STORE_REPOSITORY) private readonly stores: StoreRepository) {}

  public async list(
    actorRoles: readonly string[],
    query: AdminStoreListQuery,
  ): Promise<AdminStoreListResult> {
    if (!isPlatformAdmin(actorRoles)) {
      throw new StoreAccessDeniedError();
    }
    return this.stores.listAdmin(query);
  }

  public async stats(actorRoles: readonly string[]): Promise<AdminStoreStats> {
    if (!isPlatformAdmin(actorRoles)) {
      throw new StoreAccessDeniedError();
    }
    return this.stores.statsByStatus();
  }
}
