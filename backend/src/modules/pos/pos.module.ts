import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { POS_PROVISIONER } from '../../shared-kernel/application/ports/pos-provisioner.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { CreateReceiptHandler } from './application/commands/create-receipt.handler';
import { ReceiptTemplateHandler } from './application/commands/receipt-template.handler';
import { RECEIPT_REPOSITORY } from './application/ports/receipt-repository.interface';
import { RECEIPT_TEMPLATE_REPOSITORY } from './application/ports/receipt-template-repository.interface';
import { PosAuthorizationService } from './application/services/pos-authorization.service';
import { PosProvisionerAdapter } from './infrastructure/access/pos-provisioner.adapter';
import { ReceiptOrmEntity } from './infrastructure/persistence/receipt.orm-entity';
import { ReceiptRepositoryAdapter } from './infrastructure/persistence/receipt.repository.adapter';
import { ReceiptSequenceOrmEntity } from './infrastructure/persistence/receipt-sequence.orm-entity';
import { ReceiptTemplateOrmEntity } from './infrastructure/persistence/receipt-template.orm-entity';
import { ReceiptTemplateRepositoryAdapter } from './infrastructure/persistence/receipt-template.repository.adapter';
import { PosReceiptController } from './presentation/http/pos-receipt.controller';

@Global()
@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([
      ReceiptTemplateOrmEntity,
      ReceiptOrmEntity,
      ReceiptSequenceOrmEntity,
    ]),
  ],
  controllers: [PosReceiptController],
  providers: [
    PosAuthorizationService,
    ReceiptTemplateHandler,
    CreateReceiptHandler,
    {
      provide: RECEIPT_TEMPLATE_REPOSITORY,
      useClass: ReceiptTemplateRepositoryAdapter,
    },
    {
      provide: RECEIPT_REPOSITORY,
      useClass: ReceiptRepositoryAdapter,
    },
    { provide: POS_PROVISIONER, useClass: PosProvisionerAdapter },
  ],
  exports: [ReceiptTemplateHandler, CreateReceiptHandler, POS_PROVISIONER],
})
export class PosModule {}
