import { Inject, Injectable, Logger } from '@nestjs/common';
import type { JobsOptions, Queue } from 'bullmq';
import { AppConfigService } from '../../../config/app-config.service';
import { BULLMQ_DEFAULT_JOB_OPTIONS } from '../../../shared-kernel/infrastructure/queues/bullmq-default-job-options';
import {
  ABANDONED_CART_CHECK_DELAY_MS,
  abandonedCartJobId,
} from '../application/abandoned-cart.types';
import { AI_PERSONALIZATION_JOB_NAMES } from './ai-personalization.constants';
import type { CheckAbandonedCartJobPayload } from './ai-personalization-job.types';
import { AiPersonalizationEnqueuerService } from './ai-personalization-enqueuer.service';

@Injectable()
export class AbandonedCartSchedulerService {
  private readonly logger = new Logger(AbandonedCartSchedulerService.name);

  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
    private readonly enqueuer: AiPersonalizationEnqueuerService,
  ) {}

  public async scheduleCartCheck(cartId: string): Promise<void> {
    if (this.config.isTest || !this.config.outboxDispatchEnabled) {
      return;
    }

    const queue = this.enqueuer.getQueue();
    const jobId = abandonedCartJobId(cartId);
    await this.removeExistingJob(queue, jobId);

    const payload: CheckAbandonedCartJobPayload = {
      jobName: AI_PERSONALIZATION_JOB_NAMES.checkAbandonedCart,
      cartId,
      requestedAt: new Date().toISOString(),
    };

    const options: JobsOptions = {
      ...BULLMQ_DEFAULT_JOB_OPTIONS,
      jobId,
      delay: ABANDONED_CART_CHECK_DELAY_MS,
    };

    await queue.add(
      AI_PERSONALIZATION_JOB_NAMES.checkAbandonedCart,
      payload,
      options as JobsOptions,
    );
    this.logger.debug(
      `Scheduled ${AI_PERSONALIZATION_JOB_NAMES.checkAbandonedCart} for cart ${cartId}.`,
    );
  }

  public async cancelCartCheck(cartId: string): Promise<void> {
    if (this.config.isTest || !this.config.outboxDispatchEnabled) {
      return;
    }

    const removed = await this.removeExistingJob(
      this.enqueuer.getQueue(),
      abandonedCartJobId(cartId),
    );
    if (removed) {
      this.logger.debug(`Cancelled abandoned-cart recovery for cart ${cartId}.`);
    }
  }

  private async removeExistingJob(queue: Queue, jobId: string): Promise<boolean> {
    const existing = await queue.getJob(jobId);
    if (!existing) {
      return false;
    }
    await existing.remove();
    return true;
  }
}
