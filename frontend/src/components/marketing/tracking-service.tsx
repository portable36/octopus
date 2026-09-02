'use client';

import { captureAttributionFromLocation } from '@/lib/attribution';
import { fetchPublicMarketingConfig, type PublicMarketingConfig } from '@/lib/marketing-api';
import { useEffect, useState } from 'react';

/** Loads marketing config + attribution; GTM injection is handled by GoogleTagManager. */
export function TrackingService() {
  const [, setConfig] = useState<PublicMarketingConfig | null>(null);

  useEffect(() => {
    captureAttributionFromLocation();
    void fetchPublicMarketingConfig()
      .then(setConfig)
      .catch(() => {
        setConfig(null);
      });
  }, []);

  return null;
}
