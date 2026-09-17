'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  getNotificationPreferences,
  listNotifications,
  markNotificationRead,
  updateNotificationPreferences,
  type InAppNotification,
  type NotificationPreferences,
} from '@/lib/notifications-api';

export default function AccountNotificationsPage() {
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [prefsPending, setPrefsPending] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [list, preferences] = await Promise.all([
        listNotifications(50),
        getNotificationPreferences(),
      ]);
      setItems([...list.items]);
      setUnreadCount(list.unreadCount);
      setPrefs(preferences);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load notifications.');
      setItems([]);
      setPrefs(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function markRead(id: string) {
    setPendingId(id);
    try {
      await markNotificationRead(id);
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to mark as read.');
    } finally {
      setPendingId(null);
    }
  }

  async function patchPrefs(patch: Partial<NotificationPreferences>) {
    setPrefsPending(true);
    try {
      const next = await updateNotificationPreferences(patch);
      setPrefs(next);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to update preferences.');
    } finally {
      setPrefsPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <Link href="/account" className="hover:underline">
            Account
          </Link>
          <span aria-hidden="true"> / </span>
          Notifications
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Order and account alerts appear here. Marketing messages follow your preferences below.
          {unreadCount > 0 ? ` ${unreadCount} unread.` : null}
        </p>
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="space-y-3" aria-labelledby="inbox-heading">
        <h2 id="inbox-heading" className="text-sm font-medium">
          Inbox
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Notifications">
            {items.map((item) => {
              const unread = item.readAt === null;
              return (
                <li
                  key={item.id}
                  className={`flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm ${
                    unread ? 'bg-muted/40' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className={unread ? 'font-semibold' : 'font-medium'}>{item.title}</p>
                    <p className="text-muted-foreground">{item.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                      {unread ? ' · Unread' : ''}
                    </p>
                  </div>
                  {unread ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pendingId === item.id}
                      onClick={() => void markRead(item.id)}
                    >
                      Mark read
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="prefs-heading">
        <h2 id="prefs-heading" className="text-sm font-medium">
          Preferences
        </h2>
        <p className="text-xs text-muted-foreground">
          Security and transactional messages (orders, payments, password changes) are always on.
        </p>
        {prefs ? (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm">
              <span>Marketing email</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={prefs.marketingEmail}
                disabled={prefsPending}
                onChange={(event) => void patchPrefs({ marketingEmail: event.target.checked })}
              />
            </label>
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm">
              <span>Marketing in-app</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={prefs.marketingInApp}
                disabled={prefsPending}
                onChange={(event) => void patchPrefs({ marketingInApp: event.target.checked })}
              />
            </label>
          </div>
        ) : loading ? null : (
          <p className="text-sm text-muted-foreground">Preferences unavailable.</p>
        )}
      </section>
    </div>
  );
}
