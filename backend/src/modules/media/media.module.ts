import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { MediaHandlers } from './application/commands/media.handlers';
import { MEDIA_REPOSITORY } from './application/ports/media-repository.interface';
import { MediaAssetOrmEntity } from './infrastructure/persistence/media-asset.orm-entity';
import { MediaRepositoryAdapter } from './infrastructure/persistence/media.repository.adapter';
import { AdminMediaController } from './presentation/http/admin-media.controller';
import { PublicMediaController } from './presentation/http/public-media.controller';

@Module({
  imports: [DatabaseModule, MikroOrmModule.forFeature([MediaAssetOrmEntity])],
  controllers: [AdminMediaController, PublicMediaController],
  providers: [
    MediaHandlers,
    {
      provide: MEDIA_REPOSITORY,
      useClass: MediaRepositoryAdapter,
    },
  ],
  exports: [MediaHandlers, MEDIA_REPOSITORY],
})
export class MediaModule {}
