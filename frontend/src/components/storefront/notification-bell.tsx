'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ensureAccessToken } from '@/lib/auth-api';
import { listNotifications } from '@/lib/notifications-api';

export function NotificationBell() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    const token = await ensureAccessToken();
    if (!token) {
      setAuthed(false);
      setUnreadCount(0);
      return;
    }
    setAuthed(true);
    try {
      const result = await listNotifications(1);
      setUnreadCount(result.unreadCount);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) {
        return;
      }
      await refreshUnread();
    })();

    const onFocus = () => {
      void refreshUnread();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshUnread]);

  if (authed !== true) {
    return null;
  }

  const label =
    unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : 'Notifications';

  return (
    <Link href="/account/notifications" className="sf-action-link relative" aria-label={label}>
      Alerts
      {unreadCount > 0 ? (
        <span
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--cf-accent,#c2410c)] px-1 text-[10px] font-semibold text-white"
          aria-hidden="true"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
