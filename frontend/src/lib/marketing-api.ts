import { apiRequest } from '@/lib/api-client';

export type PublicMarketingConfig = {
  gtmContainerId: string | null;
  ga4MeasurementId: string | null;
  metaPixelId: string | null;
  enabled: boolean;
};

export async function fetchPublicMarketingConfig(): Promise<PublicMarketingConfig> {
  return apiRequest<PublicMarketingConfig>('/public/marketing/config');
}
