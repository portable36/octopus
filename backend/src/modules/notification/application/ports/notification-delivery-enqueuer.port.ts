export const NOTIFICATION_DELIVERY_ENQUEUER = Symbol('NOTIFICATION_DELIVERY_ENQUEUER');

export interface NotificationDeliveryEnqueuerPort {
  enqueueEmailDelivery(notificationId: string): Promise<void>;
}
