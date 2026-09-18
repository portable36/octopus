import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { ContentPageHandlers } from './application/commands/content-page.handlers';
import { PAGE_REPOSITORY } from './application/ports/page-repository.interface';
import { ContentPageOrmEntity } from './infrastructure/persistence/content-page.orm-entity';
import { ContentPagePublicationOrmEntity } from './infrastructure/persistence/content-page-publication.orm-entity';
import { PageRepositoryAdapter } from './infrastructure/persistence/page.repository.adapter';
import { AdminContentPagesController } from './presentation/http/admin-content-pages.controller';
import { PublicContentPagesController } from './presentation/http/public-content-pages.controller';

@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([ContentPageOrmEntity, ContentPagePublicationOrmEntity]),
  ],
  controllers: [AdminContentPagesController, PublicContentPagesController],
  providers: [
    ContentPageHandlers,
    {
      provide: PAGE_REPOSITORY,
      useClass: PageRepositoryAdapter,
    },
  ],
  exports: [ContentPageHandlers, PAGE_REPOSITORY],
})
export class ContentModule {}
