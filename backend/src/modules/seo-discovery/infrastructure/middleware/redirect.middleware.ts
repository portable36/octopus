import type { NextFunction, Request, Response } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { RedirectResolutionService } from '../../application/services/redirect-resolution.service';

@Injectable()
export class RedirectMiddleware implements NestMiddleware {
  constructor(private readonly redirects: RedirectResolutionService) {}

  public async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (this.shouldSkip(req.path)) {
      next();
      return;
    }

    const rule = await this.redirects.resolve(req.path);
    if (!rule) {
      next();
      return;
    }

    if (rule.statusCode === 410) {
      res.status(410).end();
      return;
    }

    const location = this.resolveLocation(req, rule.targetUrl);
    res.redirect(rule.statusCode, location);
  }

  private shouldSkip(path: string): boolean {
    return (
      path.startsWith('/api/') ||
      path === '/robots.txt' ||
      path === '/sitemap.xml' ||
      path === '/sitemaps/images.xml' ||
      path.startsWith('/api/docs')
    );
  }

  private resolveLocation(req: Request, target: string): string {
    if (target.startsWith('http://') || target.startsWith('https://')) {
      return target;
    }
    const normalized = target.startsWith('/') ? target : `/${target}`;
    return `${req.protocol}://${req.get('host') ?? 'localhost'}${normalized}`;
  }
}
