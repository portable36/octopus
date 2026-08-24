import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import type {
  MembershipDirectory,
  MembershipRecord,
} from '../../../../shared-kernel/application/ports/membership-directory.port';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import { UserMembershipOrmEntity } from './user-membership.orm-entity';

@Injectable()
export class MembershipDirectoryAdapter implements MembershipDirectory {
  constructor(private readonly em: EntityManager) {}

  public async findByUserId(userId: string): Promise<MembershipRecord | null> {
    return withRlsContext(this.em, async (transactionalEm) => {
      const entity = await transactionalEm.findOne(UserMembershipOrmEntity, { userId });
      if (!entity) {
        return null;
      }

      return {
        userId: entity.userId,
        vendorId: entity.vendorId,
        storeIds: entity.storeIds,
      };
    });
  }

  public async upsertVendorMembership(
    userId: string,
    vendorId: string,
    storeIds: readonly string[] = [],
  ): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(UserMembershipOrmEntity, { userId });
      if (existing) {
        existing.vendorId = vendorId;
        existing.storeIds = [...storeIds];
        existing.updatedAt = new Date();
        await tx.flush();
        return;
      }

      const entity = new UserMembershipOrmEntity();
      entity.id = UniqueID.create().value;
      entity.userId = userId;
      entity.vendorId = vendorId;
      entity.storeIds = [...storeIds];
      entity.createdAt = new Date();
      entity.updatedAt = new Date();
      await tx.persist(entity).flush();
    });
  }

  public async removeVendorMembership(userId: string, vendorId: string): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(UserMembershipOrmEntity, { userId, vendorId });
      if (!existing) {
        return;
      }
      await tx.remove(existing).flush();
    });
  }

  public async assignStoreMembership(
    userId: string,
    vendorId: string,
    storeId: string,
  ): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(UserMembershipOrmEntity, { userId });
      if (existing) {
        existing.vendorId = vendorId;
        const next = new Set(existing.storeIds);
        next.add(storeId);
        existing.storeIds = [...next];
        existing.updatedAt = new Date();
        await tx.flush();
        return;
      }

      const entity = new UserMembershipOrmEntity();
      entity.id = UniqueID.create().value;
      entity.userId = userId;
      entity.vendorId = vendorId;
      entity.storeIds = [storeId];
      entity.createdAt = new Date();
      entity.updatedAt = new Date();
      await tx.persist(entity).flush();
    });
  }

  public async revokeStoreMembership(
    userId: string,
    vendorId: string,
    storeId: string,
  ): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(UserMembershipOrmEntity, { userId, vendorId });
      if (!existing) {
        return;
      }
      existing.storeIds = existing.storeIds.filter((id) => id !== storeId);
      existing.updatedAt = new Date();
      await tx.flush();
    });
  }
}
