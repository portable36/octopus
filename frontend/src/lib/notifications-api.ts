import { authedRequest } from '@/lib/auth-api';

export type InAppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListResponse = {
  unreadCount: number;
  items: readonly InAppNotification[];
};

export type NotificationPreferences = {
  marketingEmail: boolean;
  marketingInApp: boolean;
};

export async function listNotifications(limit = 50): Promise<NotificationListResponse> {
  const clamped = Math.min(Math.max(limit, 1), 100);
  return authedRequest<NotificationListResponse>(`/notifications?limit=${clamped}`);
}

export async function markNotificationRead(
  id: string,
): Promise<{ id: string; readAt: string | null }> {
  return authedRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return authedRequest<NotificationPreferences>('/notifications/preferences');
}

export async function updateNotificationPreferences(
  patch: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  return authedRequest<NotificationPreferences>('/notifications/preferences', {
    method: 'PATCH',
    body: patch,
  });
}
