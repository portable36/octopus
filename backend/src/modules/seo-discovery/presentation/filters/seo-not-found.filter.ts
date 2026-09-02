import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Rfc7807ExceptionFilter } from '../../../../shared-kernel/infrastructure/filters/rfc7807-exception.filter';
import { normalizeRequestPath } from '../../domain/normalize-path';
import { CrawlErrorLogService } from '../../application/services/crawl-error-log.service';
import { RedirectResolutionService } from '../../application/services/redirect-resolution.service';

@Catch(NotFoundException)
export class SeoNotFoundFilter implements ExceptionFilter {
  private readonly problemFilter = new Rfc7807ExceptionFilter();

  constructor(
    private readonly crawlErrors: CrawlErrorLogService,
    private readonly redirects: RedirectResolutionService,
  ) {}

  public async catch(exception: NotFoundException, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestPath = normalizeRequestPath(request.originalUrl ?? request.url);

    try {
      await this.crawlErrors.logNotFound({
        requestPath,
        httpMethod: request.method,
        userAgent: request.get('user-agent') ?? null,
      });
    } catch {
      // Logging must not block 404 handling.
    }

    const rule = await this.redirects.resolve(requestPath);
    if (rule && (rule.statusCode === 301 || rule.statusCode === 302) && rule.targetUrl) {
      const location = this.resolveLocation(request, rule.targetUrl);
      response.redirect(rule.statusCode, location);
      return;
    }

    if (rule?.statusCode === 410) {
      response.status(HttpStatus.GONE).end();
      return;
    }

    this.problemFilter.catch(exception, host);
  }

  private resolveLocation(request: Request, target: string): string {
    if (target.startsWith('http://') || target.startsWith('https://')) {
      return target;
    }
    const normalized = target.startsWith('/') ? target : `/${target}`;
    return `${request.protocol}://${request.get('host') ?? 'localhost'}${normalized}`;
  }
}
