import type { NextFunction, Request, Response } from 'express';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { IP_BLOCK_PORT, type IpBlockPort } from '../../application/ports/ip-block.port';

const EXEMPT_PATH_SUFFIXES = ['/health/live', '/health/ready'] as const;

@Injectable()
export class IpBlockMiddleware implements NestMiddleware {
  constructor(@Inject(IP_BLOCK_PORT) private readonly ipBlocks: IpBlockPort) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (this.isExempt(req)) {
      next();
      return;
    }

    void this.ipBlocks
      .isBlocked(req.ip)
      .then((blocked) => {
        if (!blocked) {
          next();
          return;
        }
        res.status(403).type('application/problem+json').json({
          type: 'about:blank',
          title: 'Forbidden',
          status: 403,
          detail: 'Your IP address has been blocked.',
          code: 'IP_BLOCKED',
        });
      })
      .catch(() => {
        // Fail open on unexpected errors so Redis/DB blips do not take down the site.
        next();
      });
  }

  private isExempt(req: Request): boolean {
    const path = (req.path || req.url.split('?')[0] || '').replace(/\/+$/, '') || '/';
    return EXEMPT_PATH_SUFFIXES.some(
      (suffix) => path === suffix || path.endsWith(suffix) || path === `/api/v1${suffix}`,
    );
  }
}
