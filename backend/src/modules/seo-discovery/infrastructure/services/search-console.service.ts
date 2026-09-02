import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import { fetchGoogleAccessToken } from './google-service-account-auth';

const WEBMASTERS_API_BASE = 'https://www.googleapis.com/webmasters/v3';

export function buildSearchConsoleSiteUrl(publicSiteUrl: string): string {
  const url = new URL(publicSiteUrl);
  return `${url.origin}/`;
}

export function buildProductionSitemapUrls(publicSiteUrl: string): readonly string[] {
  const base = publicSiteUrl.replace(/\/$/, '');
  return [`${base}/sitemap.xml`, `${base}/sitemaps/images.xml`];
}

function buildSubmitSitemapUrl(siteUrl: string, feedpath: string): string {
  return `${WEBMASTERS_API_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(feedpath)}`;
}

@Injectable()
export class SearchConsoleApiService {
  private readonly logger = new Logger(SearchConsoleApiService.name);
  private cachedAccessToken: { readonly token: string; readonly expiresAtMs: number } | null =
    null;

  constructor(private readonly config: AppConfigService) {}

  public isConfigured(): boolean {
    return Boolean(this.config.googleServicesClientEmail && this.config.googleServicesPrivateKey);
  }

  public async submitProductionSitemaps(): Promise<void> {
    const siteUrl = buildSearchConsoleSiteUrl(this.config.seoPublicSiteUrl);
    const sitemapUrls = buildProductionSitemapUrls(this.config.seoPublicSiteUrl);

    for (const sitemapUrl of sitemapUrls) {
      await this.submitSitemap(siteUrl, sitemapUrl);
    }

    this.logger.log(
      `Search Console notified for ${sitemapUrls.length} production sitemaps on ${siteUrl}.`,
    );
  }

  public async submitSitemap(siteUrl: string, feedpath: string): Promise<void> {
    const clientEmail = this.config.googleServicesClientEmail;
    const privateKey = this.config.googleServicesPrivateKey;
    if (!clientEmail || !privateKey) {
      this.logger.debug(
        'Search Console submit skipped — GOOGLE_SERVICES_CLIENT_EMAIL or GOOGLE_SERVICES_PRIVATE_KEY not configured.',
      );
      return;
    }

    const accessToken = await this.resolveAccessToken(clientEmail, privateKey);
    const url = buildSubmitSitemapUrl(siteUrl, feedpath);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Length': '0',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Search Console sitemap submit HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      );
    }

    this.logger.log(`Search Console sitemap submitted: ${feedpath}`);
  }

  private async resolveAccessToken(clientEmail: string, privateKey: string): Promise<string> {
    const now = Date.now();
    if (this.cachedAccessToken && this.cachedAccessToken.expiresAtMs > now + 60_000) {
      return this.cachedAccessToken.token;
    }

    const token = await fetchGoogleAccessToken(clientEmail, privateKey);
    this.cachedAccessToken = { token, expiresAtMs: now + 3_300_000 };
    return token;
  }
}
