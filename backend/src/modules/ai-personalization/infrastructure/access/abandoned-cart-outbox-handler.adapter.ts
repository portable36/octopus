import { Injectable } from '@nestjs/common';
import type { AbandonedCartOutboxHandler } from '../../../../shared-kernel/application/ports/abandoned-cart-outbox-handler.port';
import { AbandonedCartRecoveryService } from '../../application/services/abandoned-cart-recovery.service';

@Injectable()
export class AbandonedCartOutboxHandlerAdapter implements AbandonedCartOutboxHandler {
  constructor(private readonly recovery: AbandonedCartRecoveryService) {}

  public async handle(eventType: string, payload: Record<string, unknown>): Promise<void> {
    await this.recovery.handle(eventType, payload);
  }
}
