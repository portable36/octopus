export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

export type SendSmsCommand = {
  readonly to: string;
  readonly message: string;
  /** Correlation only — never log secrets. */
  readonly notificationId: string;
};

export type SendSmsResult = {
  readonly providerMessageId: string;
};

export interface SmsProviderPort {
  send(command: SendSmsCommand): Promise<SendSmsResult>;
}
