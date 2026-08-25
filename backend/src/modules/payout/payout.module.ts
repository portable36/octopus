import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { LEDGER_PORT } from '../../shared-kernel/application/ports/ledger.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { LedgerCommandHandler } from './application/commands/ledger.handlers';
import { PayoutCommandHandler } from './application/commands/payout.handlers';
import { LEDGER_REPOSITORY } from './application/ports/ledger-repository.interface';
import { PAYOUT_PROVIDER } from './application/ports/payout-provider.port';
import { PAYOUT_REPOSITORY } from './application/ports/payout-repository.interface';
import { LedgerAuthorizationService } from './application/services/ledger-authorization.service';
import { PayoutAuthorizationService } from './application/services/payout-authorization.service';
import { LedgerPortAdapter } from './infrastructure/access/ledger-port.adapter';
import {
  PayoutOutboxOrmEntity,
  VendorLedgerBalanceOrmEntity,
  VendorLedgerEntryOrmEntity,
} from './infrastructure/persistence/ledger.orm-entity';
import { LedgerRepositoryAdapter } from './infrastructure/persistence/ledger.repository.adapter';
import { VendorPayoutOrmEntity } from './infrastructure/persistence/payout.orm-entity';
import { PayoutRepositoryAdapter } from './infrastructure/persistence/payout.repository.adapter';
import { StubPayoutProviderAdapter } from './infrastructure/providers/stub-payout.provider';
import { LedgerController } from './presentation/http/ledger.controller';
import { PayoutController } from './presentation/http/payout.controller';

@Global()
@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([
      VendorLedgerEntryOrmEntity,
      VendorLedgerBalanceOrmEntity,
      PayoutOutboxOrmEntity,
      VendorPayoutOrmEntity,
    ]),
  ],
  controllers: [LedgerController, PayoutController],
  providers: [
    LedgerAuthorizationService,
    PayoutAuthorizationService,
    LedgerCommandHandler,
    PayoutCommandHandler,
    { provide: LEDGER_REPOSITORY, useClass: LedgerRepositoryAdapter },
    { provide: PAYOUT_REPOSITORY, useClass: PayoutRepositoryAdapter },
    { provide: PAYOUT_PROVIDER, useClass: StubPayoutProviderAdapter },
    { provide: LEDGER_PORT, useClass: LedgerPortAdapter },
  ],
  exports: [LEDGER_PORT, LedgerCommandHandler, PayoutCommandHandler],
})
export class PayoutModule {}
