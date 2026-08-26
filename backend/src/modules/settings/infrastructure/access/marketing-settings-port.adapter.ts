import { Inject, Injectable } from '@nestjs/common';
import {
  type MarketingSettingsPort,
  type MarketingRuntimeSettings,
  type PublicMarketingConfig,
  toPublicMarketingConfig,
} from '../../../../shared-kernel/application/ports/marketing-settings.port';
import {
  CONFIGURATION_REPOSITORY,
  type ConfigurationRepository,
} from '../../application/ports/configuration-repository.interface';
import { resolveEffectiveMarketing } from '../../domain/services/resolve-effective';

@Injectable()
export class MarketingSettingsPortAdapter implements MarketingSettingsPort {
  constructor(
    @Inject(CONFIGURATION_REPOSITORY) private readonly configs: ConfigurationRepository,
  ) {}

  public async getRuntime(): Promise<MarketingRuntimeSettings> {
    const documents = await this.configs.findForResolution('marketing', { kind: 'platform' });
    return resolveEffectiveMarketing(documents, { kind: 'platform' });
  }

  public async getPublic(): Promise<PublicMarketingConfig> {
    return toPublicMarketingConfig(await this.getRuntime());
  }
}
