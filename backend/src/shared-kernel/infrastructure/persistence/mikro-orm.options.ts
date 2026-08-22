import type { Options } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import type { AppConfigService } from '../../../config/app-config.service';
import { PlatformSchemaLockEntity } from './platform-schema-lock.entity';

export function createMikroOrmOptions(config: AppConfigService): Options {
  return {
    clientUrl: config.databaseUrl,
    driver: PostgreSqlDriver,
    extensions: [Migrator],
    entities: [PlatformSchemaLockEntity],
    migrations: {
      path: 'dist/migrations',
      pathTs: 'src/migrations',
      glob: '!(*.d).{js,ts}',
      transactional: true,
      disableForeignKeys: false,
      allOrNothing: true,
    },
    debug: !config.isProduction && !config.isTest,
    allowGlobalContext: false,
    pool: {
      min: 1,
      max: 10,
    },
  };
}
