import { Injectable, Logger } from '@nestjs/common';
import type {
  EmailProviderPort,
  SendEmailCommand,
  SendEmailResult,
} from '../../application/ports/email-provider.port';

/** Dev/test stub — logs subject/to only, never body secrets. */
@Injectable()
export class LogEmailProviderAdapter implements EmailProviderPort {
  private readonly logger = new Logger(LogEmailProviderAdapter.name);

  public async send(command: SendEmailCommand): Promise<SendEmailResult> {
    const providerMessageId = `log-${command.notificationId}`;
    this.logger.log(
      `EMAIL stub to=${command.to} subject=${command.subject} notificationId=${command.notificationId}`,
    );
    return { providerMessageId };
  }
}
