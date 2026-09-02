import { Inject, Injectable } from '@nestjs/common';
import type {
  ProvisionerResult,
  WarehouseProvisionerPort,
  WarehouseProvisionInput,
} from '../../../../shared-kernel/application/ports/warehouse-provisioner.port';
import { Warehouse } from '../../domain/aggregates/warehouse.aggregate';
import {
  WAREHOUSE_REPOSITORY,
  type WarehouseRepository,
} from '../../application/ports/warehouse-repository.interface';

@Injectable()
export class WarehouseProvisionerAdapter implements WarehouseProvisionerPort {
  constructor(@Inject(WAREHOUSE_REPOSITORY) private readonly warehouses: WarehouseRepository) {}

  public async provision(input: WarehouseProvisionInput): Promise<ProvisionerResult> {
    try {
      const code = input.code?.trim() || 'MAIN';
      const existing = await this.warehouses.findByStoreAndCode(input.storeId, code);
      if (existing) {
        return { success: true };
      }
      const warehouse = Warehouse.create({
        vendorId: input.vendorId,
        storeId: input.storeId,
        code,
        name: input.name?.trim() || 'Main Warehouse',
        addressLine: input.addressLine ?? null,
      });
      await this.warehouses.save(warehouse);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Warehouse provisioning failed.';
      return { success: false, error: message };
    }
  }
}
