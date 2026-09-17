export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');

export type PushPlatform = 'web' | 'android' | 'ios';

export type SendPushCommand = {
  readonly tokens: readonly string[];
  readonly title: string;
  readonly body: string;
  /** Correlation only — never log device tokens. */
  readonly notificationId: string;
  readonly data?: Readonly<Record<string, string>>;
};

export type SendPushResult = {
  readonly providerMessageId: string;
  readonly deliveredCount: number;
};

export interface PushProviderPort {
  send(command: SendPushCommand): Promise<SendPushResult>;
}
