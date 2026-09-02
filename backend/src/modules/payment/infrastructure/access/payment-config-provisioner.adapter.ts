import { Injectable } from '@nestjs/common';
import type {
  PaymentConfigProvisionerPort,
  PaymentConfigProvisionInput,
  ProvisionerResult,
} from '../../../../shared-kernel/application/ports/payment-config-provisioner.port';

@Injectable()
export class PaymentConfigProvisionerAdapter implements PaymentConfigProvisionerPort {
  public async provision(_input: PaymentConfigProvisionInput): Promise<ProvisionerResult> {
    return { success: true };
  }
}
