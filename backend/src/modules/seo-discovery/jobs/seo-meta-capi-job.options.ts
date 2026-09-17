import type { JobsOptions } from 'bullmq';

/** Meta CAPI outbound jobs — longer backoff than default for Graph API rate limits. */
export const SEO_META_CAPI_JOB_OPTIONS: JobsOptions = {
  attempts: 6,
  backoff: { type: 'exponential', delay: 30_000 },
  priority: 25,
  removeOnComplete: { age: 86_400, count: 500 },
  removeOnFail: { age: 604_800, count: 1_000 },
};
