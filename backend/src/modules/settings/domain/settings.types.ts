export type ConfigurationScopeKind = 'platform' | 'vendor' | 'store';

export type ConfigurationScope =
  | { readonly kind: 'platform' }
  | { readonly kind: 'vendor'; readonly vendorId: string }
  | { readonly kind: 'store'; readonly vendorId: string; readonly storeId: string };

export type ConfigurationKey = 'general' | 'branding' | 'marketing' | 'theme';

export type GeneralSettings = {
  readonly schemaVersion: 1;
  readonly supportEmail: string | null;
  readonly defaultLocale: string;
  readonly defaultCurrencyCode: string;
  readonly vendorRegistrationEnabled: boolean;
};

export type BrandingSettings = {
  readonly schemaVersion: 1;
  readonly siteName: string | null;
  readonly tagline: string | null;
  readonly primaryColor: string | null;
  readonly logoMediaId: string | null;
  readonly faviconMediaId: string | null;
};

export type MarketingSettings = {
  readonly schemaVersion: 1;
  readonly gtmContainerId: string | null;
  readonly ga4MeasurementId: string | null;
  /** Server-only — never expose via public config. */
  readonly ga4MpApiSecret: string | null;
  readonly metaPixelId: string | null;
  /** Server-only — never expose via public config. */
  readonly metaCapiToken: string | null;
  readonly enabled: boolean;
};

export type ThemeNavAction = {
  readonly label: string;
  readonly href: string;
};

export type ThemeFooterColumn = {
  readonly title: string;
  readonly links: readonly ThemeNavAction[];
};

export type ThemeSettings = {
  readonly schemaVersion: 1;
  readonly announcementBar: {
    readonly enabled: boolean;
    readonly text: string;
    readonly linkText: string | null;
    readonly linkUrl: string | null;
  };
  readonly colors: {
    readonly primary: string | null;
    readonly accent: string | null;
    readonly announcementBg: string | null;
    readonly announcementText: string | null;
  };
  readonly heroBanner: {
    readonly enabled: boolean;
    readonly title: string;
    readonly subtitle: string;
    readonly ctaText: string | null;
    readonly ctaUrl: string | null;
    readonly badgeText: string | null;
    readonly imageUrl: string | null;
  };
  readonly promoBanner: {
    readonly enabled: boolean;
    readonly title: string;
    readonly text: string;
    readonly ctaText: string | null;
    readonly ctaUrl: string | null;
  };
  readonly header: {
    readonly searchPlaceholder: string | null;
    readonly navLinks: readonly ThemeNavAction[];
  };
  readonly footer: {
    readonly aboutText: string | null;
    readonly copyrightText: string | null;
    readonly columns: readonly ThemeFooterColumn[];
  };
};

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  schemaVersion: 1,
  supportEmail: null,
  defaultLocale: 'en',
  defaultCurrencyCode: 'BDT',
  vendorRegistrationEnabled: false,
};

export const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
  schemaVersion: 1,
  siteName: null,
  tagline: null,
  primaryColor: null,
  logoMediaId: null,
  faviconMediaId: null,
};

export const DEFAULT_MARKETING_SETTINGS: MarketingSettings = {
  schemaVersion: 1,
  gtmContainerId: null,
  ga4MeasurementId: null,
  ga4MpApiSecret: null,
  metaPixelId: null,
  metaCapiToken: null,
  enabled: false,
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

export type ConfigurationDocumentRecord = {
  readonly id: string;
  readonly key: ConfigurationKey;
  readonly scopeKind: ConfigurationScopeKind;
  readonly vendorId: string | null;
  readonly storeId: string | null;
  readonly schemaVersion: number;
  readonly payload: Record<string, unknown>;
  readonly updatedAt: Date;
  readonly updatedBy: string | null;
};
