import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../../../config/app-config.service';
import {
  createRequestContext,
  runWithTenantContext,
  setPlatformScope,
} from '../../../shared-kernel/infrastructure/context/tenant-context.storage';
import { SyncShipmentStatusHandler } from '../application/commands/fulfillment.handlers';
import {
  FULFILLMENT_REPOSITORY,
  type FulfillmentRepository,
} from '../application/ports/fulfillment-repository.interface';

export interface PollActiveShipmentsResult {
  readonly polled: number;
  readonly transitioned: number;
  readonly delivered: number;
  readonly errors: number;
}

@Injectable()
export class FulfillmentStatusPollerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FulfillmentStatusPollerService.name);
  private timer: NodeJS.Timeout | null = null;
  private isPolling = false;

  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Inject(FULFILLMENT_REPOSITORY) private readonly shipments: FulfillmentRepository,
    private readonly syncHandler: SyncShipmentStatusHandler,
  ) {}

  public onModuleInit(): void {
    if (this.config.isTest || !this.config.fulfillmentStatusPollEnabled) {
      this.logger.log(
        'Courier status poller disabled (test or FULFILLMENT_STATUS_POLL_ENABLED=false).',
      );
      return;
    }
    const intervalMs = this.config.fulfillmentStatusPollIntervalMs;
    this.logger.log(`Starting courier status poller with interval ${intervalMs}ms.`);
    this.timer = setInterval(() => {
      void this.pollActiveShipments();
    }, intervalMs);
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async pollNow(limit = 50): Promise<PollActiveShipmentsResult> {
    return this.pollActiveShipments(limit);
  }

  private async pollActiveShipments(limit = 50): Promise<PollActiveShipmentsResult> {
    if (this.isPolling) {
      this.logger.debug('Courier poller run skipped: previous poll still in progress.');
      return { polled: 0, transitioned: 0, delivered: 0, errors: 0 };
    }
    this.isPolling = true;

    let polled = 0;
    let transitioned = 0;
    let delivered = 0;
    let errors = 0;

    try {
      const req = createRequestContext(randomUUID());
      await runWithTenantContext(req, async () => {
        setPlatformScope(true);

        const activeShipments = await this.shipments.findActiveCourierShipments(limit);
        polled = activeShipments.length;

        for (const shipment of activeShipments) {
          try {
            const result = await this.syncHandler.syncShipment(shipment);
            if (result.statusChanged) {
              transitioned++;
              this.logger.log(
                `Shipment ${shipment.id.value} transitioned from ${result.previousStatus} to ${result.currentStatus} (${shipment.provider}).`,
              );
            }
            if (result.becameDelivered) {
              delivered++;
            }
          } catch (err) {
            errors++;
            this.logger.warn(
              `Failed to sync shipment ${shipment.id.value} (${shipment.provider}): ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          }
        }
      });
    } catch (outerErr) {
      this.logger.error(
        `Courier poller cycle failed: ${
          outerErr instanceof Error ? outerErr.message : String(outerErr)
        }`,
      );
    } finally {
      this.isPolling = false;
    }

    return { polled, transitioned, delivered, errors };
  }
}
