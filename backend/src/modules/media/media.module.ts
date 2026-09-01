import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { MediaHandlers } from './application/commands/media.handlers';
import { OBJECT_STORAGE } from './application/ports/object-storage.port';
import { MEDIA_REPOSITORY } from './application/ports/media-repository.interface';
import { MediaAuthorizationService } from './application/services/media-authorization.service';
import { MediaAssetOrmEntity } from './infrastructure/persistence/media-asset.orm-entity';
import { MediaRepositoryAdapter } from './infrastructure/persistence/media.repository.adapter';
import { MediaAssetAccessAdapter } from './infrastructure/access/media-asset-access.adapter';
import { S3ObjectStorageAdapter } from './infrastructure/storage/s3-object-storage.adapter';
import { AdminMediaController } from './presentation/http/admin-media.controller';
import { PublicMediaController } from './presentation/http/public-media.controller';
import { VendorMediaController } from './presentation/http/vendor-media.controller';
import { MEDIA_ASSET_ACCESS } from '../../shared-kernel/application/ports/media-asset-access.port';

@Global()
@Module({
  imports: [DatabaseModule, MikroOrmModule.forFeature([MediaAssetOrmEntity])],
  controllers: [AdminMediaController, PublicMediaController, VendorMediaController],
  providers: [
    MediaHandlers,
    MediaAuthorizationService,
    {
      provide: MEDIA_REPOSITORY,
      useClass: MediaRepositoryAdapter,
    },
    {
      provide: OBJECT_STORAGE,
      useClass: S3ObjectStorageAdapter,
    },
    {
      provide: MEDIA_ASSET_ACCESS,
      useClass: MediaAssetAccessAdapter,
    },
  ],
  exports: [MediaHandlers, MEDIA_REPOSITORY, MEDIA_ASSET_ACCESS],
})
export class MediaModule {}
