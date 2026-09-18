import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { StorefrontShell } from '@/components/layout/storefront-shell';
import { resolveStorefrontBranding } from '@/lib/storefront-branding';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await resolveStorefrontBranding();
  const metadata: Metadata = {
    title: {
      // absolute: ignore root `%s · Octopus` template for the storefront home default
      absolute: branding.siteName,
      default: branding.siteName,
      template: `%s · ${branding.siteName}`,
    },
  };
  if (branding.faviconUrl) {
    metadata.icons = {
      icon: [{ url: branding.faviconUrl }],
      shortcut: branding.faviconUrl,
      apple: branding.faviconUrl,
    };
  }
  if (branding.tagline) {
    metadata.description = branding.tagline;
  }
  return metadata;
}

export default function StorefrontLayout({ children }: { readonly children: ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
