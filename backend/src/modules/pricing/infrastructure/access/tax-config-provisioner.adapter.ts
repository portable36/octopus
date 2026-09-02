import { Injectable } from '@nestjs/common';
import type {
  ProvisionerResult,
  TaxConfigProvisionerPort,
  TaxConfigProvisionInput,
} from '../../../../shared-kernel/application/ports/tax-config-provisioner.port';

@Injectable()
export class TaxConfigProvisionerAdapter implements TaxConfigProvisionerPort {
  public async provision(_input: TaxConfigProvisionInput): Promise<ProvisionerResult> {
    return { success: true };
  }
}
