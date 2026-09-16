import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../../config/app-config.service';
import { assertAllowedOutboundUrl } from '../../../../shared-kernel/infrastructure/security/assert-allowed-outbound-url';
import { signHmacSha256Hex } from '../../../../shared-kernel/infrastructure/security/sign-hmac-sha256';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import type { OutboxJobPayload } from '../../domain/outbox.types';
import { runOutboxDelivery } from '../outbox-delivery';

const DELIVER_TIMEOUT_MS = 10_000;

/**
 * Idempotent outbound webhook consumer for `octopus.webhooks`.
 * Posts signed JSON when WEBHOOK_OUTBOUND_URLS is set; otherwise logs (stub).
 * Expected event: WebhookDeliver (payload may include eventName override).
 */
@Injectable()
export class WebhooksProcessor {
  private readonly logger = new Logger(WebhooksProcessor.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  public async handle(job: OutboxJobPayload): Promise<void> {
    const processed = await runOutboxDelivery(this.redis, job.outboxId, async () => {
      await this.deliver(job);
    });
    if (!processed) {
      this.logger.debug(`Skipping duplicate webhook job ${job.outboxId} (${job.eventType})`);
    }
  }

  private async deliver(job: OutboxJobPayload): Promise<void> {
    const urls = this.config.webhookOutboundUrls;
    const eventName =
      typeof job.payload['eventName'] === 'string' && job.payload['eventName'].trim()
        ? job.payload['eventName'].trim()
        : job.eventType;
    const bodyObject = {
      id: job.outboxId,
      eventType: eventName,
      aggregateId: job.aggregateId,
      source: job.source,
      eventVersion: job.eventVersion,
      occurredAt: new Date().toISOString(),
      data: job.payload,
    };
    const body = JSON.stringify(bodyObject);

    if (urls.length === 0) {
      this.logger.log(
        `WebhookDeliver stub (no WEBHOOK_OUTBOUND_URLS): ${eventName} aggregate=${job.aggregateId}`,
      );
      return;
    }

    const secret = this.config.webhookOutboundSecret;
    if (!secret) {
      throw new Error('WEBHOOK_OUTBOUND_SECRET is required when WEBHOOK_OUTBOUND_URLS is set.');
    }

    const timestampSec = Math.floor(Date.now() / 1000);
    const signature = signHmacSha256Hex(`${timestampSec}.${body}`, secret);
    const allowHosts = this.config.outboundUrlAllowlistHosts;

    for (const url of urls) {
      assertAllowedOutboundUrl(url, allowHosts);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DELIVER_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-octopus-signature': signature,
            'x-octopus-timestamp': String(timestampSec),
            'x-octopus-event': eventName,
            'x-octopus-delivery': job.outboxId,
          },
          body,
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Webhook POST ${url} returned HTTP ${response.status}`);
        }
        this.logger.log(`Webhook delivered ${eventName} → ${new URL(url).host}`);
      } finally {
        clearTimeout(timer);
      }
    }
  }
}
