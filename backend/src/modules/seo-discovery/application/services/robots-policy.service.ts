import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';

export type RobotsPolicy = {
  readonly userAgent: string;
  readonly allow: readonly string[];
  readonly disallow: readonly string[];
  readonly sitemapUrl: string;
};

const DEFAULT_DISALLOW = [
  '/admin',
  '/admin/',
  '/account',
  '/account/',
  '/cart',
  '/checkout',
  '/login',
  '/register',
  '/vendor',
  '/vendor/',
] as const;

@Injectable()
export class RobotsPolicyService {
  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  public buildPolicy(): RobotsPolicy {
    const siteUrl = this.config.seoPublicSiteUrl.replace(/\/$/, '');
    const extraDisallow = this.config.seoRobotsDisallow;
    const disallow = [...DEFAULT_DISALLOW, ...extraDisallow];

    return {
      userAgent: '*',
      allow: ['/'],
      disallow,
      sitemapUrl: `${siteUrl}/sitemap.xml`,
    };
  }

  public renderRobotsTxt(): string {
    const policy = this.buildPolicy();
    const lines = [
      `User-agent: ${policy.userAgent}`,
      ...policy.allow.map((path) => `Allow: ${path}`),
      ...policy.disallow.map((path) => `Disallow: ${path}`),
      `Sitemap: ${policy.sitemapUrl}`,
      '',
    ];
    return lines.join('\n');
  }
}
