import { describe, expect, it } from 'vitest';
import {
  applyMetaAndromedaPrivacyFields,
  buildMetaAndromedaPrivacyConfig,
  parseMetaAndromedaDataProcessingOptionsList,
  resolveMetaCapiActionSource,
} from './meta-gem-env';

describe('meta-gem-env', () => {
  it('parses Andromeda data processing options JSON array', () => {
    expect(parseMetaAndromedaDataProcessingOptionsList('["LDU"]')).toEqual(['LDU']);
    expect(parseMetaAndromedaDataProcessingOptionsList('[]')).toEqual([]);
  });

  it('builds privacy config from split env fields', () => {
    const config = buildMetaAndromedaPrivacyConfig({
      optionsRaw: '["LDU"]',
      country: 1,
      state: 0,
    });
    expect(config).toEqual({ options: ['LDU'], country: 1, state: 0 });
  });

  it('maps CAPI data source values to Meta action_source', () => {
    expect(resolveMetaCapiActionSource('system_generated')).toBe('system_generated');
    expect(resolveMetaCapiActionSource('server')).toBe('website');
  });

  it('applies Andromeda privacy fields to CAPI event payloads', () => {
    const event: Record<string, unknown> = {};
    applyMetaAndromedaPrivacyFields(event, { options: ['LDU'], country: 1, state: 0 });
    expect(event).toEqual({
      data_processing_options: ['LDU'],
      data_processing_options_country: 1,
      data_processing_options_state: 0,
    });
  });
});
