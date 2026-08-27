import type { Options } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import type { AppConfigService } from '../../../config/app-config.service';
import { PlatformSchemaLockEntity } from './platform-schema-lock.entity';
import { SlowQueryLogger } from './slow-query-logger';

export function createMikroOrmOptions(config: AppConfigService): Options {
  const debugSql = !config.isProduction && !config.isTest;
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
    debug: debugSql,
    loggerFactory: (options) =>
      new SlowQueryLogger(config.databaseSlowQueryMs, {
        ...options,
        writer: options.writer ?? ((message: string) => console.warn(message)),
      }),
    allowGlobalContext: false,
    pool: {
      min: config.databasePoolMin,
      max: Math.max(config.databasePoolMin, config.databasePoolMax),
    },
  };
}
