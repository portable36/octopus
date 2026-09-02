import { Injectable } from '@nestjs/common';
import type { AbandonedCartRecoveryPort } from '../../../../shared-kernel/application/ports/abandoned-cart-recovery.port';
import { AbandonedCartRecoveryService } from '../../application/services/abandoned-cart-recovery.service';

@Injectable()
export class AbandonedCartRecoveryPortAdapter implements AbandonedCartRecoveryPort {
  constructor(private readonly recovery: AbandonedCartRecoveryService) {}

  public async onCartUpdated(cartId: string): Promise<void> {
    await this.recovery.onCartUpdated(cartId);
  }

  public async onPurchaseCompleted(input: { readonly orderId: string }): Promise<void> {
    await this.recovery.onPurchaseCompleted(input);
  }

  public async cancelForCart(cartId: string): Promise<void> {
    await this.recovery.cancelForCart(cartId);
  }
}
