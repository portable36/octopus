'use client';

import { Suspense, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

/**
 * Real OAuth providers redirect here (see backend redirect_uri).
 * Forward code/state onto /login so one place completes the session.
 */
function OAuthCallbackRedirect() {
  const router = useRouter();
  const params = useParams<{ provider: string }>();
  const searchParams = useSearchParams();

  useEffect(() => {
    const provider = params.provider;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const next = searchParams.get('next');
    const query = new URLSearchParams();
    if (provider === 'google' || provider === 'facebook') {
      query.set('oauth_provider', provider);
    }
    if (code) {
      query.set('code', code);
    }
    if (state) {
      query.set('state', state);
    }
    if (next) {
      query.set('next', next);
    }
    router.replace(`/login?${query.toString()}`);
  }, [params.provider, router, searchParams]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Completing sign-in…
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Completing sign-in…
        </div>
      }
    >
      <OAuthCallbackRedirect />
    </Suspense>
  );
}
