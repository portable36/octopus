import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AUDIT_PORT } from '../../shared-kernel/application/ports/audit.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { AuditHandlers } from './application/commands/audit.handlers';
import { AUDIT_REPOSITORY } from './application/ports/audit-repository.interface';
import { AuditPortAdapter } from './infrastructure/access/audit-port.adapter';
import { AuditEventOrmEntity } from './infrastructure/persistence/audit-event.orm-entity';
import { AuditRepositoryAdapter } from './infrastructure/persistence/audit.repository.adapter';
import { AdminAuditController } from './presentation/http/admin-audit.controller';

@Global()
@Module({
  imports: [DatabaseModule, MikroOrmModule.forFeature([AuditEventOrmEntity])],
  controllers: [AdminAuditController],
  providers: [
    AuditHandlers,
    {
      provide: AUDIT_REPOSITORY,
      useClass: AuditRepositoryAdapter,
    },
    {
      provide: AUDIT_PORT,
      useClass: AuditPortAdapter,
    },
  ],
  exports: [AuditHandlers, AUDIT_PORT],
})
export class AuditModule {}
