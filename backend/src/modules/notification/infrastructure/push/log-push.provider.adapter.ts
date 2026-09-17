import { Injectable, Logger } from '@nestjs/common';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import type {
  PushProviderPort,
  SendPushCommand,
  SendPushResult,
} from '../../application/ports/push-provider.port';

/** Dev/default adapter — no network; never logs device tokens. */
@Injectable()
export class LogPushProviderAdapter implements PushProviderPort {
  private readonly logger = new Logger(LogPushProviderAdapter.name);

  public async send(command: SendPushCommand): Promise<SendPushResult> {
    const deliveredCount = command.tokens.length;
    this.logger.log(
      `PUSH stub devices=${deliveredCount} titleLen=${command.title.length} notificationId=${command.notificationId}`,
    );
    return {
      providerMessageId: `log-push-${UniqueID.create().value}`,
      deliveredCount,
    };
  }
}
