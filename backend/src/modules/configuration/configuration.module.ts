import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { RedisModule } from '../../shared-kernel/infrastructure/redis/redis.module';
import { GLOBAL_CONFIG_PORT } from '../../shared-kernel/application/ports/global-config.port';
import { GlobalConfigService } from './infrastructure/services/global-config.service';
import { GlobalSetting } from './infrastructure/entities/global-setting.entity';
import { GlobalConfigAdminController } from './presentation/controllers/global-config-admin.controller';

@Global()
@Module({
  imports: [DatabaseModule, RedisModule, MikroOrmModule.forFeature([GlobalSetting])],
  controllers: [GlobalConfigAdminController],
  providers: [
    GlobalConfigService,
    { provide: GLOBAL_CONFIG_PORT, useExisting: GlobalConfigService },
  ],
  exports: [GLOBAL_CONFIG_PORT, GlobalConfigService],
})
export class ConfigurationModule {}
