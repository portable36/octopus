import type { JobsOptions } from 'bullmq';

/** Low-priority, debounced Search Console ping with API-safe exponential backoff. */
export const SEO_SEARCH_CONSOLE_PING_JOB_OPTIONS: JobsOptions = {
  attempts: 6,
  backoff: { type: 'exponential', delay: 60_000 },
  priority: 30,
  delay: 30_000,
  removeOnComplete: { age: 86_400, count: 100 },
  removeOnFail: { age: 604_800, count: 500 },
};
