import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  CUSTOMER_REPOSITORY,
  type CustomerRepository,
} from '../ports/customer-repository.interface';
import type { CustomerAddressRecord } from '../../domain/customer.types';

@Injectable()
export class CustomerHandlers {
  constructor(@Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository) {}

  public async getOrCreateProfile(userId: string, fallbackName: string) {
    const existing = await this.customers.getProfile(userId);
    if (existing) {
      return existing;
    }
    return this.customers.upsertProfile(userId, { displayName: fallbackName });
  }

  public async updateProfile(
    userId: string,
    patch: { readonly displayName?: string; readonly phone?: string | null },
  ) {
    return this.customers.upsertProfile(userId, patch);
  }

  public async listAddresses(userId: string) {
    return this.customers.listAddresses(userId);
  }

  public async addAddress(
    userId: string,
    input: {
      readonly label: string;
      readonly recipientName: string;
      readonly phone?: string | null;
      readonly line1: string;
      readonly line2?: string | null;
      readonly city: string;
      readonly region?: string | null;
      readonly postalCode?: string | null;
      readonly countryCode: string;
      readonly isDefault?: boolean;
    },
  ): Promise<CustomerAddressRecord> {
    const now = new Date();
    const isDefault = input.isDefault === true;
    if (isDefault) {
      await this.customers.clearDefaultFlags(userId);
    }
    return this.customers.saveAddress({
      id: UniqueID.create().value,
      userId,
      label: input.label.trim(),
      recipientName: input.recipientName.trim(),
      phone: input.phone ?? null,
      line1: input.line1.trim(),
      line2: input.line2 ?? null,
      city: input.city.trim(),
      region: input.region ?? null,
      postalCode: input.postalCode ?? null,
      countryCode: input.countryCode.trim().toUpperCase(),
      isDefault,
      createdAt: now,
      updatedAt: now,
    });
  }

  public async updateAddress(
    userId: string,
    addressId: string,
    patch: {
      readonly label?: string;
      readonly recipientName?: string;
      readonly phone?: string | null;
      readonly line1?: string;
      readonly line2?: string | null;
      readonly city?: string;
      readonly region?: string | null;
      readonly postalCode?: string | null;
      readonly countryCode?: string;
      readonly isDefault?: boolean;
    },
  ): Promise<CustomerAddressRecord> {
    const existing = await this.customers.findAddress(userId, addressId);
    if (!existing) {
      throw new NotFoundException({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Address not found.',
        code: 'CUSTOMER_ADDRESS_NOT_FOUND',
      });
    }
    const isDefault = patch.isDefault ?? existing.isDefault;
    if (isDefault && !existing.isDefault) {
      await this.customers.clearDefaultFlags(userId);
    }
    return this.customers.saveAddress({
      ...existing,
      label: patch.label?.trim() ?? existing.label,
      recipientName: patch.recipientName?.trim() ?? existing.recipientName,
      phone: patch.phone !== undefined ? patch.phone : existing.phone,
      line1: patch.line1?.trim() ?? existing.line1,
      line2: patch.line2 !== undefined ? patch.line2 : existing.line2,
      city: patch.city?.trim() ?? existing.city,
      region: patch.region !== undefined ? patch.region : existing.region,
      postalCode: patch.postalCode !== undefined ? patch.postalCode : existing.postalCode,
      countryCode: patch.countryCode?.trim().toUpperCase() ?? existing.countryCode,
      isDefault,
      updatedAt: new Date(),
    });
  }

  public async deleteAddress(userId: string, addressId: string): Promise<void> {
    const deleted = await this.customers.deleteAddress(userId, addressId);
    if (!deleted) {
      throw new NotFoundException({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Address not found.',
        code: 'CUSTOMER_ADDRESS_NOT_FOUND',
      });
    }
  }
}
