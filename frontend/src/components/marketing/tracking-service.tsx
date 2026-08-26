'use client';

import { useEffect, useState } from 'react';
import { captureAttributionFromLocation } from '@/lib/attribution';
import { fetchPublicMarketingConfig, type PublicMarketingConfig } from '@/lib/marketing-api';
import { readAnalyticsConsent } from '@/components/marketing/consent-manager';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function ensureDataLayer(): Record<string, unknown>[] {
  window.dataLayer = window.dataLayer ?? [];
  return window.dataLayer;
}

export function pushDataLayer(event: string, payload: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') {
    return;
  }
  ensureDataLayer().push({ event, ...payload });
}

function loadGtm(containerId: string): void {
  if (document.getElementById('octopus-gtm')) {
    return;
  }
  ensureDataLayer().push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.id = 'octopus-gtm';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
  document.head.appendChild(script);
}

export function TrackingService() {
  const [config, setConfig] = useState<PublicMarketingConfig | null>(null);

  useEffect(() => {
    captureAttributionFromLocation();
    void fetchPublicMarketingConfig()
      .then(setConfig)
      .catch(() => {
        setConfig(null);
      });
  }, []);

  useEffect(() => {
    function maybeLoad(): void {
      if (!config?.enabled || !config.gtmContainerId) {
        return;
      }
      if (!readAnalyticsConsent()) {
        return;
      }
      loadGtm(config.gtmContainerId);
    }

    maybeLoad();
    const onConsent = () => maybeLoad();
    window.addEventListener('octopus:consent', onConsent);
    return () => window.removeEventListener('octopus:consent', onConsent);
  }, [config]);

  return null;
}
