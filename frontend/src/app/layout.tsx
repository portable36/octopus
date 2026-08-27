import type { Metadata } from 'next';
import { AppProviders } from './providers';
import { ErrorBoundary } from '@/components/error-boundary';
import { getPublicAppName, getPublicSiteUrl } from '@/lib/env';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(getPublicSiteUrl()),
  title: {
    default: getPublicAppName(),
    template: `%s · ${getPublicAppName()}`,
  },
  description: 'Multi-vendor, multi-store commerce platform',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Extensions (e.g. Grammarly/QuillBot) inject attrs onto html/body before hydrate.
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProviders>
          <ErrorBoundary>{children}</ErrorBoundary>
        </AppProviders>
      </body>
    </html>
  );
}
