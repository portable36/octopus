import { Injectable } from '@nestjs/common';
import type {
  ProvisionerResult,
  ShippingConfigProvisionerPort,
  ShippingConfigProvisionInput,
} from '../../../../shared-kernel/application/ports/shipping-config-provisioner.port';

@Injectable()
export class ShippingConfigProvisionerAdapter implements ShippingConfigProvisionerPort {
  public async provision(_input: ShippingConfigProvisionInput): Promise<ProvisionerResult> {
    return { success: true };
  }
}
