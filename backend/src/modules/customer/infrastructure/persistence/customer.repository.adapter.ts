import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type {
  CustomerAddressRecord,
  CustomerProfileRecord,
  ProductReviewRecord,
  ProductReviewSummary,
  WishlistItemRecord,
} from '../../domain/customer.types';
import type { CustomerRepository } from '../../application/ports/customer-repository.interface';
import { CustomerAddressOrmEntity } from './customer-address.orm-entity';
import { CustomerProfileOrmEntity } from './customer-profile.orm-entity';
import {
  CustomerWishlistItemOrmEntity,
  ProductReviewOrmEntity,
} from './engagement.orm-entity';

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

  public async listWishlist(userId: string): Promise<readonly WishlistItemRecord[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        CustomerWishlistItemOrmEntity,
        { userId },
        { orderBy: { createdAt: 'DESC' } },
      );
      return entities.map(wishlistToRecord);
    });
  }

  public async findWishlistItem(
    userId: string,
    productId: string,
  ): Promise<WishlistItemRecord | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(CustomerWishlistItemOrmEntity, { userId, productId });
      return entity ? wishlistToRecord(entity) : null;
    });
  }

  public async addWishlistItem(item: WishlistItemRecord): Promise<WishlistItemRecord> {
    return withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(CustomerWishlistItemOrmEntity, {
        userId: item.userId,
        productId: item.productId,
      });
      if (existing) {
        return wishlistToRecord(existing);
      }
      const entity = new CustomerWishlistItemOrmEntity();
      entity.id = item.id;
      entity.userId = item.userId;
      entity.productId = item.productId;
      entity.variantId = item.variantId;
      entity.storeId = item.storeId;
      entity.createdAt = item.createdAt;
      await tx.persist(entity).flush();
      return wishlistToRecord(entity);
    });
  }

  public async removeWishlistItem(userId: string, productId: string): Promise<boolean> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(CustomerWishlistItemOrmEntity, { userId, productId });
      if (!entity) {
        return false;
      }
      await tx.remove(entity).flush();
      return true;
    });
  }

  public async listPublishedReviews(productId: string): Promise<readonly ProductReviewRecord[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        ProductReviewOrmEntity,
        { productId, status: 'PUBLISHED' },
        { orderBy: { createdAt: 'DESC' }, limit: 100 },
      );
      return entities.map(reviewToRecord);
    });
  }

  public async getReviewSummary(productId: string): Promise<ProductReviewSummary> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(ProductReviewOrmEntity, {
        productId,
        status: 'PUBLISHED',
      });
      if (entities.length === 0) {
        return { productId, averageRating: 0, reviewCount: 0 };
      }
      const sum = entities.reduce((acc, e) => acc + e.rating, 0);
      return {
        productId,
        averageRating: Math.round((sum / entities.length) * 10) / 10,
        reviewCount: entities.length,
      };
    });
  }

  public async findReviewByUser(
    userId: string,
    productId: string,
  ): Promise<ProductReviewRecord | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(ProductReviewOrmEntity, { userId, productId });
      return entity ? reviewToRecord(entity) : null;
    });
  }

  public async saveReview(review: ProductReviewRecord): Promise<ProductReviewRecord> {
    return withRlsContext(this.em, async (tx) => {
      let entity = await tx.findOne(ProductReviewOrmEntity, { id: review.id });
      if (!entity) {
        entity = new ProductReviewOrmEntity();
        entity.id = review.id;
        entity.createdAt = review.createdAt;
      }
      entity.productId = review.productId;
      entity.userId = review.userId;
      entity.orderId = review.orderId;
      entity.rating = review.rating;
      entity.title = review.title;
      entity.body = review.body;
      entity.status = review.status;
      entity.updatedAt = review.updatedAt;
      await tx.persist(entity).flush();
      return reviewToRecord(entity);
    });
  }

  public async deleteReview(userId: string, reviewId: string): Promise<boolean> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(ProductReviewOrmEntity, { id: reviewId, userId });
      if (!entity) {
        return false;
      }
      await tx.remove(entity).flush();
      return true;
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

function wishlistToRecord(entity: CustomerWishlistItemOrmEntity): WishlistItemRecord {
  return {
    id: entity.id,
    userId: entity.userId,
    productId: entity.productId,
    variantId: entity.variantId,
    storeId: entity.storeId,
    createdAt: entity.createdAt,
  };
}

function reviewToRecord(entity: ProductReviewOrmEntity): ProductReviewRecord {
  return {
    id: entity.id,
    productId: entity.productId,
    userId: entity.userId,
    orderId: entity.orderId,
    rating: entity.rating,
    title: entity.title,
    body: entity.body,
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
