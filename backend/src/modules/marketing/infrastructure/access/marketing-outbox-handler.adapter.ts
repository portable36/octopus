import { Injectable } from '@nestjs/common';
import type { MarketingOutboxHandler } from '../../../../shared-kernel/application/ports/marketing-outbox-handler.port';
import { MarketingDeliveryService } from '../../application/services/marketing-delivery.service';

@Injectable()
export class MarketingOutboxHandlerAdapter implements MarketingOutboxHandler {
  constructor(private readonly delivery: MarketingDeliveryService) {}

  public handle(eventType: string, payload: Record<string, unknown>): Promise<void> {
    return this.delivery.handle(eventType, payload);
  }
}
