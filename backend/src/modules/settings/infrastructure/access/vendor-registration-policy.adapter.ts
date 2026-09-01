import { Inject, Injectable } from '@nestjs/common';
import type { VendorRegistrationPolicy } from '../../../../shared-kernel/application/ports/vendor-registration-policy.port';
import {
  CONFIGURATION_REPOSITORY,
  type ConfigurationRepository,
} from '../../application/ports/configuration-repository.interface';
import { resolveEffectiveGeneral } from '../../domain/services/resolve-effective';

@Injectable()
export class VendorRegistrationPolicyAdapter implements VendorRegistrationPolicy {
  constructor(
    @Inject(CONFIGURATION_REPOSITORY) private readonly configs: ConfigurationRepository,
  ) {}

  public async isEnabled(): Promise<boolean> {
    const documents = await this.configs.findForResolution('general', { kind: 'platform' });
    return resolveEffectiveGeneral(documents, { kind: 'platform' }).vendorRegistrationEnabled;
  }
}
