import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { REPORTING_OUTBOX_HANDLER } from '../../shared-kernel/application/ports/reporting-outbox-handler.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { ReportingQueryHandler } from './application/queries/reporting-query.handler';
import { REPORTING_ORDER_FACT_REPOSITORY } from './application/ports/reporting-order-fact-repository.interface';
import { ReportingProjectionService } from './application/services/reporting-projection.service';
import { ReportingOrderFactOrmEntity } from './infrastructure/persistence/reporting-order-fact.orm-entity';
import { ReportingOrderFactRepositoryAdapter } from './infrastructure/persistence/reporting-order-fact.repository.adapter';
import { AdminReportsController } from './presentation/http/admin-reports.controller';

@Global()
@Module({
  imports: [DatabaseModule, MikroOrmModule.forFeature([ReportingOrderFactOrmEntity])],
  controllers: [AdminReportsController],
  providers: [
    ReportingProjectionService,
    ReportingQueryHandler,
    {
      provide: REPORTING_ORDER_FACT_REPOSITORY,
      useClass: ReportingOrderFactRepositoryAdapter,
    },
    {
      provide: REPORTING_OUTBOX_HANDLER,
      useExisting: ReportingProjectionService,
    },
  ],
  exports: [REPORTING_OUTBOX_HANDLER, ReportingQueryHandler],
})
export class ReportingModule {}
