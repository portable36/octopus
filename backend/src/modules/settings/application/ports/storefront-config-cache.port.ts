import type { ConfigurationScope } from '../../domain/settings.types';
import type { StorefrontPublicConfig } from '../mappers/storefront-public-config';

export const STOREFRONT_CONFIG_CACHE = Symbol('STOREFRONT_CONFIG_CACHE');

export interface StorefrontConfigCachePort {
  get(scope: ConfigurationScope): Promise<StorefrontPublicConfig | null>;
  set(scope: ConfigurationScope, value: StorefrontPublicConfig): Promise<void>;
  invalidateAll(): Promise<void>;
}
