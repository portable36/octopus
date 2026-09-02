'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { readAnalyticsConsent } from '@/components/marketing/consent-manager';
import { getPublicGtmId } from '@/lib/env';

export function GoogleTagManager() {
  const gtmId = getPublicGtmId();
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    setConsentGranted(readAnalyticsConsent());
    const onConsent = () => setConsentGranted(readAnalyticsConsent());
    window.addEventListener('octopus:consent', onConsent);
    return () => window.removeEventListener('octopus:consent', onConsent);
  }, []);

  if (!gtmId || !consentGranted) {
    return null;
  }

  const loader = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`;

  return (
    <>
      <Script id="octopus-gtm-loader" strategy="afterInteractive">
        {loader}
      </Script>
      <noscript>
        <iframe
          title="Google Tag Manager"
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  );
}
