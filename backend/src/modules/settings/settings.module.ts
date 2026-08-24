import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { SettingsHandlers } from './application/commands/settings.handlers';
import { CONFIGURATION_REPOSITORY } from './application/ports/configuration-repository.interface';
import { SettingsAuthorizationService } from './application/services/settings-authorization.service';
import { ConfigurationDocumentOrmEntity } from './infrastructure/persistence/configuration-document.orm-entity';
import { ConfigurationRepositoryAdapter } from './infrastructure/persistence/configuration.repository.adapter';
import { AdminSettingsController } from './presentation/http/admin-settings.controller';

@Module({
  imports: [DatabaseModule, MikroOrmModule.forFeature([ConfigurationDocumentOrmEntity])],
  controllers: [AdminSettingsController],
  providers: [
    SettingsAuthorizationService,
    SettingsHandlers,
    {
      provide: CONFIGURATION_REPOSITORY,
      useClass: ConfigurationRepositoryAdapter,
    },
  ],
  exports: [SettingsHandlers],
})
export class SettingsModule {}
