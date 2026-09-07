import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_SETTINGS, type ThemeSettings } from './storefront-config-api';

describe('Storefront Theme Customizer defaults and structure', () => {
  it('provides comprehensive default theme settings matching storefront layout', () => {
    expect(DEFAULT_THEME_SETTINGS.schemaVersion).toBe(1);
    expect(DEFAULT_THEME_SETTINGS.announcementBar.enabled).toBe(true);
    expect(DEFAULT_THEME_SETTINGS.announcementBar.text).toBe('Delivery across Bangladesh');
    expect(DEFAULT_THEME_SETTINGS.announcementBar.linkText).toBe('Track order');
    expect(DEFAULT_THEME_SETTINGS.announcementBar.linkUrl).toBe('/account/orders');

    expect(DEFAULT_THEME_SETTINGS.colors.accent).toBe('#2563eb');
    expect(DEFAULT_THEME_SETTINGS.colors.primary).toBe('#0f172a');
    expect(DEFAULT_THEME_SETTINGS.colors.announcementBg).toBe('#1e293b');
    expect(DEFAULT_THEME_SETTINGS.colors.announcementText).toBe('#ffffff');

    expect(DEFAULT_THEME_SETTINGS.heroBanner.enabled).toBe(true);
    expect(DEFAULT_THEME_SETTINGS.heroBanner.title).toBe('Good finds. Close to home.');
    expect(DEFAULT_THEME_SETTINGS.heroBanner.badgeText).toBe('A marketplace for everyday finds');
    expect(DEFAULT_THEME_SETTINGS.heroBanner.ctaText).toBe('Explore offers');
    expect(DEFAULT_THEME_SETTINGS.heroBanner.ctaUrl).toBe('/search');

    expect(DEFAULT_THEME_SETTINGS.promoBanner.enabled).toBe(true);
    expect(DEFAULT_THEME_SETTINGS.promoBanner.title).toBe('Sell on Octopus');
    expect(DEFAULT_THEME_SETTINGS.promoBanner.ctaText).toBe('Open vendor portal');

    expect(DEFAULT_THEME_SETTINGS.header.searchPlaceholder).toBe('Search products');
    expect(DEFAULT_THEME_SETTINGS.header.navLinks).toHaveLength(4);
    expect(DEFAULT_THEME_SETTINGS.header.navLinks.map((l) => l.label)).toEqual([
      'Home',
      'Categories',
      'Stores',
      'Search',
    ]);

    expect(DEFAULT_THEME_SETTINGS.footer.columns).toHaveLength(3);
    expect(DEFAULT_THEME_SETTINGS.footer.columns.map((c) => c.title)).toEqual([
      'Shop',
      'Help',
      'Sell',
    ]);
  });

  it('allows customizing banner slots, colors, and links seamlessly', () => {
    const customized: ThemeSettings = {
      ...DEFAULT_THEME_SETTINGS,
      colors: {
        ...DEFAULT_THEME_SETTINGS.colors,
        accent: '#10b981',
      },
      heroBanner: {
        ...DEFAULT_THEME_SETTINGS.heroBanner,
        title: 'Dhaka Special Discounts',
        badgeText: 'Curated Deals',
      },
      header: {
        ...DEFAULT_THEME_SETTINGS.header,
        searchPlaceholder: 'Search over 10,000 items...',
      },
    };

    expect(customized.colors.accent).toBe('#10b981');
    expect(customized.heroBanner.title).toBe('Dhaka Special Discounts');
    expect(customized.heroBanner.badgeText).toBe('Curated Deals');
    expect(customized.header.searchPlaceholder).toBe('Search over 10,000 items...');
    // Unchanged properties preserved
    expect(customized.promoBanner.enabled).toBe(true);
    expect(customized.footer.columns).toHaveLength(3);
  });
});
