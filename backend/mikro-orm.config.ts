import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { PlatformSchemaLockEntity } from './src/shared-kernel/infrastructure/persistence/platform-schema-lock.entity';
import { UserOrmEntity } from './src/modules/identity/infrastructure/persistence/user.orm-entity';
import { UserMembershipOrmEntity } from './src/modules/tenancy/infrastructure/persistence/user-membership.orm-entity';
import { TenantIsolationSampleOrmEntity } from './src/modules/tenancy/infrastructure/persistence/tenant-isolation-sample.orm-entity';
import { VendorOrmEntity } from './src/modules/vendor/infrastructure/persistence/vendor.orm-entity';
import { VendorStaffOrmEntity } from './src/modules/vendor/infrastructure/persistence/vendor-staff.orm-entity';
import { StoreOrmEntity } from './src/modules/store/infrastructure/persistence/store.orm-entity';
import { StoreStaffOrmEntity } from './src/modules/store/infrastructure/persistence/store-staff.orm-entity';
import { ProductOrmEntity } from './src/modules/catalog/infrastructure/persistence/product.orm-entity';
import { VariantOrmEntity } from './src/modules/catalog/infrastructure/persistence/variant.orm-entity';
import { CategoryOrmEntity } from './src/modules/catalog/infrastructure/persistence/category.orm-entity';
import { StoreOfferOrmEntity } from './src/modules/catalog/infrastructure/persistence/store-offer.orm-entity';
import { ReceiptTemplateOrmEntity } from './src/modules/pos/infrastructure/persistence/receipt-template.orm-entity';
import { ReceiptOrmEntity } from './src/modules/pos/infrastructure/persistence/receipt.orm-entity';
import { ReceiptSequenceOrmEntity } from './src/modules/pos/infrastructure/persistence/receipt-sequence.orm-entity';
import { WarehouseOrmEntity } from './src/modules/inventory/infrastructure/persistence/warehouse.orm-entity';
import { InventoryItemOrmEntity } from './src/modules/inventory/infrastructure/persistence/inventory-item.orm-entity';
import { InventoryReservationOrmEntity } from './src/modules/inventory/infrastructure/persistence/inventory-reservation.orm-entity';
import { InventoryMovementOrmEntity } from './src/modules/inventory/infrastructure/persistence/inventory-movement.orm-entity';
import { InventoryOperationOrmEntity } from './src/modules/inventory/infrastructure/persistence/inventory-operation.orm-entity';
import { Redirect } from './src/modules/seo-discovery/infrastructure/entities/redirect.entity';
import { SeoOverride } from './src/modules/seo-discovery/infrastructure/entities/seo-override.entity';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for MikroORM CLI operations.');
}

export default defineConfig({
  clientUrl: databaseUrl,
  extensions: [Migrator],
  entities: [
    PlatformSchemaLockEntity,
    UserOrmEntity,
    UserMembershipOrmEntity,
    TenantIsolationSampleOrmEntity,
    VendorOrmEntity,
    VendorStaffOrmEntity,
    StoreOrmEntity,
    StoreStaffOrmEntity,
    ProductOrmEntity,
    VariantOrmEntity,
    CategoryOrmEntity,
    StoreOfferOrmEntity,
    ReceiptTemplateOrmEntity,
    ReceiptOrmEntity,
    ReceiptSequenceOrmEntity,
    WarehouseOrmEntity,
    InventoryItemOrmEntity,
    InventoryReservationOrmEntity,
    InventoryMovementOrmEntity,
    InventoryOperationOrmEntity,
    Redirect,
    SeoOverride,
  ],
  migrations: {
    path: 'dist/migrations',
    pathTs: 'src/migrations',
    glob: '!(*.d).{js,ts}',
    transactional: true,
    disableForeignKeys: false,
    allOrNothing: true,
  },
  debug: process.env.NODE_ENV === 'development',
});
