export type NotificationChannel = 'EMAIL' | 'IN_APP';
export type NotificationLocale = 'en' | 'bn';
export type DeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export type NotificationTemplate = {
  readonly id: string;
  readonly templateKey: string;
  readonly channel: NotificationChannel;
  readonly locale: NotificationLocale;
  readonly version: number;
  readonly subject: string | null;
  readonly bodyText: string;
};

export type NotificationRecord = {
  readonly id: string;
  readonly eventId: string;
  readonly recipientUserId: string;
  readonly recipientEmail: string | null;
  readonly notificationType: string;
  readonly channel: NotificationChannel;
  readonly locale: NotificationLocale;
  readonly templateKey: string;
  readonly templateVersion: number;
  readonly title: string;
  readonly body: string;
  readonly payload: Record<string, unknown>;
  readonly deliveryStatus: DeliveryStatus;
  readonly readAt: Date | null;
  readonly createdAt: Date;
};

/** Replace `{{token}}` placeholders; unknown tokens become empty string. */
export function renderTemplate(template: string, data: Record<string, string>): string {
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_match, key: string) => data[key] ?? '',
  );
}
