import { Injectable } from '@nestjs/common';
import type {
  ProvisionerResult,
  SeoProvisionerPort,
  SeoProvisionInput,
} from '../../../../shared-kernel/application/ports/seo-provisioner.port';

@Injectable()
export class SeoProvisionerAdapter implements SeoProvisionerPort {
  public async provision(_input: SeoProvisionInput): Promise<ProvisionerResult> {
    return { success: true };
  }
}
