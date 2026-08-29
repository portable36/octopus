import type Redis from 'ioredis';

const OUTBOX_DEDUPE_TTL_SECONDS = 60 * 60 * 24 * 14;

/**
 * Runs an outbox side effect before recording deduplication.
 * A failed or interrupted delivery therefore remains eligible for retry.
 */
export async function runOutboxDelivery(
  redis: Redis,
  outboxId: string,
  work: () => Promise<void>,
): Promise<boolean> {
  const dedupeKey = `outbox:processed:${outboxId}`;
  if (await redis.get(dedupeKey)) {
    return false;
  }

  await work();
  await redis.set(dedupeKey, '1', 'EX', OUTBOX_DEDUPE_TTL_SECONDS, 'NX');
  return true;
}
