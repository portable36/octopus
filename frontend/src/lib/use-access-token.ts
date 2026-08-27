'use client';

import { useSyncExternalStore } from 'react';
import { getAccessToken } from '@/lib/auth-session';

/** Client access JWT from sessionStorage (never from URL). */
export function useAccessToken(): string | null {
  return useSyncExternalStore(
    () => () => undefined,
    () => getAccessToken(),
    () => null,
  );
}
