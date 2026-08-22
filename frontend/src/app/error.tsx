'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Route error boundary captured an error', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Unable to load this page</h1>
      <p className="text-sm text-muted-foreground">
        A server or client rendering error occurred. Try again or return later.
      </p>
      <Button type="button" onClick={reset}>
        Retry
      </Button>
    </main>
  );
}
