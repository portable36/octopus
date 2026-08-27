import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MARKETING_SETTINGS_PORT } from '../../shared-kernel/application/ports/marketing-settings.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { RedisModule } from '../../shared-kernel/infrastructure/redis/redis.module';
import { SettingsHandlers } from './application/commands/settings.handlers';
import { CONFIGURATION_REPOSITORY } from './application/ports/configuration-repository.interface';
import { STOREFRONT_CONFIG_CACHE } from './application/ports/storefront-config-cache.port';
import { SettingsAuthorizationService } from './application/services/settings-authorization.service';
import { MarketingSettingsPortAdapter } from './infrastructure/access/marketing-settings-port.adapter';
import { ConfigurationDocumentOrmEntity } from './infrastructure/persistence/configuration-document.orm-entity';
import { ConfigurationRepositoryAdapter } from './infrastructure/persistence/configuration.repository.adapter';
import { StorefrontConfigCache } from './infrastructure/redis/storefront-config-cache';
import { AdminSettingsController } from './presentation/http/admin-settings.controller';
import { PublicStorefrontConfigController } from './presentation/http/public-storefront-config.controller';

@Global()
@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    MikroOrmModule.forFeature([ConfigurationDocumentOrmEntity]),
  ],
  controllers: [AdminSettingsController, PublicStorefrontConfigController],
  providers: [
    SettingsAuthorizationService,
    SettingsHandlers,
    StorefrontConfigCache,
    MarketingSettingsPortAdapter,
    {
      provide: CONFIGURATION_REPOSITORY,
      useClass: ConfigurationRepositoryAdapter,
    },
    { provide: STOREFRONT_CONFIG_CACHE, useExisting: StorefrontConfigCache },
    { provide: MARKETING_SETTINGS_PORT, useExisting: MarketingSettingsPortAdapter },
  ],
  exports: [SettingsHandlers, MARKETING_SETTINGS_PORT],
})
export class SettingsModule {}
