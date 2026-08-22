import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { PlatformSchemaLockEntity } from './src/shared-kernel/infrastructure/persistence/platform-schema-lock.entity';
import { UserOrmEntity } from './src/modules/identity/infrastructure/persistence/user.orm-entity';
import { UserMembershipOrmEntity } from './src/modules/tenancy/infrastructure/persistence/user-membership.orm-entity';
import { TenantIsolationSampleOrmEntity } from './src/modules/tenancy/infrastructure/persistence/tenant-isolation-sample.orm-entity';
import { VendorOrmEntity } from './src/modules/vendor/infrastructure/persistence/vendor.orm-entity';
import { VendorStaffOrmEntity } from './src/modules/vendor/infrastructure/persistence/vendor-staff.orm-entity';

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
