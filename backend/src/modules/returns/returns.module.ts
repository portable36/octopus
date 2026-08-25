import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { ReturnsHandlers } from './application/commands/returns.handlers';
import { RETURNS_REPOSITORY } from './application/ports/returns-repository.interface';
import { ReturnsAuthorizationService } from './application/services/returns-authorization.service';
import {
  ReturnOperationOrmEntity,
  ReturnRequestOrmEntity,
  ReturnsOutboxOrmEntity,
} from './infrastructure/persistence/returns.orm-entity';
import { ReturnsRepositoryAdapter } from './infrastructure/persistence/returns.repository.adapter';
import { ReturnsController } from './presentation/http/returns.controller';

@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([
      ReturnRequestOrmEntity,
      ReturnOperationOrmEntity,
      ReturnsOutboxOrmEntity,
    ]),
  ],
  controllers: [ReturnsController],
  providers: [
    ReturnsAuthorizationService,
    ReturnsHandlers,
    { provide: RETURNS_REPOSITORY, useClass: ReturnsRepositoryAdapter },
  ],
  exports: [ReturnsHandlers],
})
export class ReturnsModule {}
