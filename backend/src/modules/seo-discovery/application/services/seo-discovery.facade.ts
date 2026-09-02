import { Injectable } from '@nestjs/common';
import { RedirectResolutionService } from './redirect-resolution.service';
import { RobotsPolicyService } from './robots-policy.service';
import { SitemapStreamService } from './sitemap-stream.service';

/**
 * Public facade for cross-module SEO discovery capabilities.
 * Prefer injecting this service over internal layer types.
 */
@Injectable()
export class SeoDiscoveryFacade {
  constructor(
    private readonly redirects: RedirectResolutionService,
    private readonly robots: RobotsPolicyService,
    private readonly sitemap: SitemapStreamService,
  ) {}

  public resolveRedirect(sourcePath: string) {
    return this.redirects.resolve(sourcePath);
  }

  public renderRobotsTxt(): string {
    return this.robots.renderRobotsTxt();
  }

  public get sitemapStream(): SitemapStreamService {
    return this.sitemap;
  }
}
