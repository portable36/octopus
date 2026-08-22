import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AppConfigService } from '../../../config/app-config.service';
import { createMikroOrmOptions } from './mikro-orm.options';
import { RlsContextSubscriber } from './rls-context.subscriber';

@Module({
  imports: [
    MikroOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        ...createMikroOrmOptions(config),
        autoLoadEntities: true,
        subscribers: [RlsContextSubscriber],
      }),
    }),
  ],
  providers: [RlsContextSubscriber],
})
export class DatabaseModule {}
