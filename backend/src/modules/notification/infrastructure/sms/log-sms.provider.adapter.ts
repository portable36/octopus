import { Injectable, Logger } from '@nestjs/common';
import type {
  SendSmsCommand,
  SendSmsResult,
  SmsProviderPort,
} from '../../application/ports/sms-provider.port';

/** Dev/test stub — logs recipient/length only, never body secrets. */
@Injectable()
export class LogSmsProviderAdapter implements SmsProviderPort {
  private readonly logger = new Logger(LogSmsProviderAdapter.name);

  public async send(command: SendSmsCommand): Promise<SendSmsResult> {
    const providerMessageId = `sms-log-${command.notificationId}`;
    this.logger.log(
      `SMS stub to=${command.to} len=${command.message.length} notificationId=${command.notificationId}`,
    );
    return { providerMessageId };
  }
}
