import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { POS_PROVISIONER } from '../../shared-kernel/application/ports/pos-provisioner.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { CreateReceiptHandler } from './application/commands/create-receipt.handler';
import { ReceiptTemplateHandler } from './application/commands/receipt-template.handler';
import { RegisterHandler } from './application/commands/register.handler';
import { RECEIPT_REPOSITORY } from './application/ports/receipt-repository.interface';
import { RECEIPT_TEMPLATE_REPOSITORY } from './application/ports/receipt-template-repository.interface';
import { REGISTER_REPOSITORY } from './application/ports/register-repository.interface';
import { PosAuthorizationService } from './application/services/pos-authorization.service';
import { PosProvisionerAdapter } from './infrastructure/access/pos-provisioner.adapter';
import { ReceiptOrmEntity } from './infrastructure/persistence/receipt.orm-entity';
import { ReceiptRepositoryAdapter } from './infrastructure/persistence/receipt.repository.adapter';
import { ReceiptSequenceOrmEntity } from './infrastructure/persistence/receipt-sequence.orm-entity';
import { ReceiptTemplateOrmEntity } from './infrastructure/persistence/receipt-template.orm-entity';
import { ReceiptTemplateRepositoryAdapter } from './infrastructure/persistence/receipt-template.repository.adapter';
import { RegisterOrmEntity } from './infrastructure/persistence/register.orm-entity';
import { RegisterRepositoryAdapter } from './infrastructure/persistence/register.repository.adapter';
import { PosReceiptController } from './presentation/http/pos-receipt.controller';
import { PosRegisterController } from './presentation/http/pos-register.controller';

@Global()
@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([
      ReceiptTemplateOrmEntity,
      ReceiptOrmEntity,
      ReceiptSequenceOrmEntity,
      RegisterOrmEntity,
    ]),
  ],
  controllers: [PosReceiptController, PosRegisterController],
  providers: [
    PosAuthorizationService,
    ReceiptTemplateHandler,
    CreateReceiptHandler,
    RegisterHandler,
    {
      provide: RECEIPT_TEMPLATE_REPOSITORY,
      useClass: ReceiptTemplateRepositoryAdapter,
    },
    {
      provide: RECEIPT_REPOSITORY,
      useClass: ReceiptRepositoryAdapter,
    },
    {
      provide: REGISTER_REPOSITORY,
      useClass: RegisterRepositoryAdapter,
    },
    { provide: POS_PROVISIONER, useClass: PosProvisionerAdapter },
  ],
  exports: [ReceiptTemplateHandler, CreateReceiptHandler, RegisterHandler, POS_PROVISIONER],
})
export class PosModule {}
