import type { JobsOptions } from 'bullmq';

/** Shared BullMQ job defaults for outbox + direct enqueuers (Phase 24.6). */
export const BULLMQ_DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2_000 },
  // Age+count so idle queues still shrink Redis (count-only never expires old keys).
  removeOnComplete: { age: 86_400, count: 1_000 },
  removeOnFail: { age: 604_800, count: 5_000 },
};

/** Dead-letter retention — never unbounded. */
export const BULLMQ_DLQ_JOB_OPTIONS: JobsOptions = {
  removeOnComplete: { age: 604_800, count: 1_000 },
  removeOnFail: { age: 2_592_000, count: 1_000 },
};
