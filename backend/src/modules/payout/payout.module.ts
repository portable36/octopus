import { Global, Module } from '@nestjs/common';
import { LEDGER_PORT } from '../../shared-kernel/application/ports/ledger.port';
import { RedisModule } from '../../shared-kernel/infrastructure/redis/redis.module';
import { StubLedgerAdapter } from './infrastructure/access/stub-ledger.adapter';

/**
 * Vendor finance home (Phase 15). Phase 14.4 only exports LedgerPort stub.
 * Do not add a second ledger elsewhere.
 */
@Global()
@Module({
  imports: [RedisModule],
  providers: [{ provide: LEDGER_PORT, useClass: StubLedgerAdapter }],
  exports: [LEDGER_PORT],
})
export class PayoutModule {}
