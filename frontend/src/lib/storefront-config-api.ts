import { apiRequest } from '@/lib/api-client';

export type ThemeNavAction = {
  label: string;
  href: string;
};

export type ThemeFooterColumn = {
  title: string;
  links: ThemeNavAction[];
};

export type ThemeSettings = {
  schemaVersion: 1;
  announcementBar: {
    enabled: boolean;
    text: string;
    linkText: string | null;
    linkUrl: string | null;
  };
  colors: {
    primary: string | null;
    accent: string | null;
    announcementBg: string | null;
    announcementText: string | null;
  };
  heroBanner: {
    enabled: boolean;
    title: string;
    subtitle: string;
    ctaText: string | null;
    ctaUrl: string | null;
    badgeText: string | null;
    imageUrl: string | null;
  };
  promoBanner: {
    enabled: boolean;
    title: string;
    text: string;
    ctaText: string | null;
    ctaUrl: string | null;
  };
  header: {
    searchPlaceholder: string | null;
    navLinks: ThemeNavAction[];
  };
  footer: {
    aboutText: string | null;
    copyrightText: string | null;
    columns: ThemeFooterColumn[];
  };
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  schemaVersion: 1,
  announcementBar: {
    enabled: true,
    text: 'Delivery across Bangladesh',
    linkText: 'Track order',
    linkUrl: '/account/orders',
  },
  colors: {
    primary: '#0f172a',
    accent: '#2563eb',
    announcementBg: '#1e293b',
    announcementText: '#ffffff',
  },
  heroBanner: {
    enabled: true,
    title: 'Good finds. Close to home.',
    subtitle:
      'Browse independent stores and published offers. Your final price and availability are confirmed at checkout.',
    ctaText: 'Explore offers',
    ctaUrl: '/search',
    badgeText: 'A marketplace for everyday finds',
    imageUrl: null,
  },
  promoBanner: {
    enabled: true,
    title: 'Sell on Octopus',
    text: 'Reach thousands of shoppers across Bangladesh with multi-vendor storefronts and automated payouts.',
    ctaText: 'Open vendor portal',
    ctaUrl: '/vendor',
  },
  header: {
    searchPlaceholder: 'Search products',
    navLinks: [
      { label: 'Home', href: '/' },
      { label: 'Categories', href: '/categories' },
      { label: 'Stores', href: '/stores' },
      { label: 'Search', href: '/search' },
    ],
  },
  footer: {
    aboutText:
      'A multi-vendor marketplace built for confident browsing, clear delivery, and server-confirmed checkout.',
    copyrightText: null,
    columns: [
      {
        title: 'Shop',
        links: [
          { label: 'Categories', href: '/categories' },
          { label: 'All offers', href: '/search' },
          { label: 'Stores', href: '/stores' },
        ],
      },
      {
        title: 'Help',
        links: [
          { label: 'Track order', href: '/account/orders' },
          { label: 'Account', href: '/account' },
        ],
      },
      {
        title: 'Sell',
        links: [{ label: 'Open vendor portal', href: '/vendor' }],
      },
    ],
  },
};

export type StorefrontPublicConfig = {
  scope:
    | { kind: 'platform' }
    | { kind: 'vendor'; vendorId: string }
    | { kind: 'store'; vendorId: string; storeId: string };
  general: {
    schemaVersion: 1;
    supportEmail: string | null;
    defaultLocale: string;
    defaultCurrencyCode: string;
    vendorRegistrationEnabled: boolean;
  };
  branding: {
    schemaVersion: 1;
    siteName: string | null;
    tagline: string | null;
    primaryColor: string | null;
    logoMediaId: string | null;
    faviconMediaId: string | null;
  };
  marketing: {
    gtmContainerId: string | null;
    ga4MeasurementId: string | null;
    metaPixelId: string | null;
    enabled: boolean;
  };
  theme: ThemeSettings;
};

export type FetchStorefrontConfigOptions = {
  vendorId?: string;
  storeId?: string;
};

export function fetchStorefrontConfig(
  options: FetchStorefrontConfigOptions = {},
): Promise<StorefrontPublicConfig> {
  const params = new URLSearchParams();
  if (options.vendorId) {
    params.set('vendorId', options.vendorId);
  }
  if (options.storeId) {
    params.set('storeId', options.storeId);
  }
  const qs = params.toString();
  return apiRequest<StorefrontPublicConfig>(`/storefront/config${qs ? `?${qs}` : ''}`);
}
