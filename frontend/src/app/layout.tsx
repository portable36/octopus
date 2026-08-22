import type { Metadata } from 'next';
import { AppProviders } from './providers';
import { ErrorBoundary } from '@/components/error-boundary';
import { getPublicAppName } from '@/lib/env';
import './globals.css';

export const metadata: Metadata = {
  title: getPublicAppName(),
  description: 'Multi-vendor, multi-store commerce platform',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <ErrorBoundary>{children}</ErrorBoundary>
        </AppProviders>
      </body>
    </html>
  );
}
