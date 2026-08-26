'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const CONSENT_COOKIE = 'octopus.consent';

export type ConsentState = {
  analytics: boolean;
};

function readConsent(): ConsentState | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) {
    return null;
  }
  try {
    const raw = decodeURIComponent(match.slice(CONSENT_COOKIE.length + 1));
    const parsed = JSON.parse(raw) as ConsentState;
    return { analytics: Boolean(parsed.analytics) };
  } catch {
    return null;
  }
}

function writeConsent(value: ConsentState): void {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=${maxAge}; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent('octopus:consent', { detail: value }));
}

export function readAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true;
}

export function ConsentManager() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readConsent() === null);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-4 shadow-lg backdrop-blur"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          We use analytics cookies to measure storefront performance when you accept. Reject to keep
          marketing tags off.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              writeConsent({ analytics: false });
              setVisible(false);
            }}
          >
            Reject
          </Button>
          <Button
            type="button"
            onClick={() => {
              writeConsent({ analytics: true });
              setVisible(false);
            }}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
