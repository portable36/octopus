export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export type SendEmailCommand = {
  readonly to: string;
  readonly subject: string;
  readonly bodyText: string;
  /** Correlation only — never log secrets. */
  readonly notificationId: string;
};

export type SendEmailResult = {
  readonly providerMessageId: string;
};

export interface EmailProviderPort {
  send(command: SendEmailCommand): Promise<SendEmailResult>;
}
