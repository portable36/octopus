import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { RedisModule } from '../../shared-kernel/infrastructure/redis/redis.module';
import { GlobalConfigService } from './application/services/global-config.service';
import { GlobalSetting } from './infrastructure/entities/global-setting.entity';
import { GlobalConfigAdminController } from './presentation/controllers/global-config-admin.controller';

@Global()
@Module({
  imports: [DatabaseModule, RedisModule, MikroOrmModule.forFeature([GlobalSetting])],
  controllers: [GlobalConfigAdminController],
  providers: [GlobalConfigService],
  exports: [GlobalConfigService],
})
export class ConfigurationModule {}
