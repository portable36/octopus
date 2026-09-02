import type { MetaCapiUserDataInput, MetaCapiCustomData } from '../infrastructure/services/meta-capi.types';
import type { SeoDiscoveryJobName } from './seo-discovery.constants';

export type SeoDiscoveryMaintenanceJobPayload = {
  readonly jobName: Exclude<SeoDiscoveryJobName, 'send-meta-capi-event'>;
  readonly requestedAt: string;
};

export type SeoDiscoveryMetaCapiJobPayload = {
  readonly jobName: 'send-meta-capi-event';
  readonly requestedAt: string;
  readonly eventName: string;
  readonly eventTime: number;
  readonly eventId: string;
  readonly userData: MetaCapiUserDataInput;
  readonly customData: MetaCapiCustomData;
};

export type SeoDiscoveryJobPayload = SeoDiscoveryMaintenanceJobPayload | SeoDiscoveryMetaCapiJobPayload;

export type MetaCapiEnqueueInput = Omit<SeoDiscoveryMetaCapiJobPayload, 'jobName' | 'requestedAt'>;
