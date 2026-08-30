'use client';

import { useSyncExternalStore } from 'react';
import { getAccessToken, subscribeAccessToken } from '@/lib/auth-session';

/** Client access JWT held in memory (never from URL or persistent storage). */
export function useAccessToken(): string | null {
  return useSyncExternalStore(
    subscribeAccessToken,
    () => getAccessToken(),
    () => null,
  );
}
