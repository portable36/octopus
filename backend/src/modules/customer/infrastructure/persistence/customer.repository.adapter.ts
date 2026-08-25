import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { CustomerAddressRecord, CustomerProfileRecord } from '../../domain/customer.types';
import type { CustomerRepository } from '../../application/ports/customer-repository.interface';
import { CustomerAddressOrmEntity } from './customer-address.orm-entity';
import { CustomerProfileOrmEntity } from './customer-profile.orm-entity';

@Injectable()
export class CustomerRepositoryAdapter implements CustomerRepository {
  constructor(private readonly em: EntityManager) {}

  public async getProfile(userId: string): Promise<CustomerProfileRecord | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(CustomerProfileOrmEntity, { userId });
      return entity ? profileToRecord(entity) : null;
    });
  }

  public async upsertProfile(
    userId: string,
    patch: { readonly displayName?: string; readonly phone?: string | null },
  ): Promise<CustomerProfileRecord> {
    return withRlsContext(this.em, async (tx) => {
      let entity = await tx.findOne(CustomerProfileOrmEntity, { userId });
      const now = new Date();
      if (!entity) {
        entity = new CustomerProfileOrmEntity();
        entity.userId = userId;
        entity.displayName = patch.displayName?.trim() || 'Customer';
        entity.phone = patch.phone ?? null;
        entity.createdAt = now;
        entity.updatedAt = now;
      } else {
        if (patch.displayName !== undefined) {
          entity.displayName = patch.displayName.trim() || entity.displayName;
        }
        if (patch.phone !== undefined) {
          entity.phone = patch.phone;
        }
        entity.updatedAt = now;
      }
      await tx.persist(entity).flush();
      return profileToRecord(entity);
    });
  }

  public async listAddresses(userId: string): Promise<readonly CustomerAddressRecord[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        CustomerAddressOrmEntity,
        { userId },
        { orderBy: { isDefault: 'desc', createdAt: 'asc' } },
      );
      return entities.map(addressToRecord);
    });
  }

  public async findAddress(
    userId: string,
    addressId: string,
  ): Promise<CustomerAddressRecord | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(CustomerAddressOrmEntity, { id: addressId, userId });
      return entity ? addressToRecord(entity) : null;
    });
  }

  public async saveAddress(address: CustomerAddressRecord): Promise<CustomerAddressRecord> {
    return withRlsContext(this.em, async (tx) => {
      let entity = await tx.findOne(CustomerAddressOrmEntity, { id: address.id });
      if (!entity) {
        entity = new CustomerAddressOrmEntity();
        entity.id = address.id;
        entity.createdAt = address.createdAt;
      }
      entity.userId = address.userId;
      entity.label = address.label;
      entity.recipientName = address.recipientName;
      entity.phone = address.phone;
      entity.line1 = address.line1;
      entity.line2 = address.line2;
      entity.city = address.city;
      entity.region = address.region;
      entity.postalCode = address.postalCode;
      entity.countryCode = address.countryCode;
      entity.isDefault = address.isDefault;
      entity.updatedAt = address.updatedAt;
      await tx.persist(entity).flush();
      return addressToRecord(entity);
    });
  }

  public async deleteAddress(userId: string, addressId: string): Promise<boolean> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(CustomerAddressOrmEntity, { id: addressId, userId });
      if (!entity) {
        return false;
      }
      await tx.remove(entity).flush();
      return true;
    });
  }

  public async clearDefaultFlags(userId: string): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(CustomerAddressOrmEntity, { userId, isDefault: true });
      for (const entity of entities) {
        entity.isDefault = false;
        entity.updatedAt = new Date();
      }
      await tx.flush();
    });
  }
}

function profileToRecord(entity: CustomerProfileOrmEntity): CustomerProfileRecord {
  return {
    userId: entity.userId,
    displayName: entity.displayName,
    phone: entity.phone,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function addressToRecord(entity: CustomerAddressOrmEntity): CustomerAddressRecord {
  return {
    id: entity.id,
    userId: entity.userId,
    label: entity.label,
    recipientName: entity.recipientName,
    phone: entity.phone,
    line1: entity.line1,
    line2: entity.line2,
    city: entity.city,
    region: entity.region,
    postalCode: entity.postalCode,
    countryCode: entity.countryCode,
    isDefault: entity.isDefault,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
