import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../../../shared-kernel/presentation/http/public.decorator';
import { RobotsPolicyService } from '../../application/services/robots-policy.service';
import { SitemapStreamService } from '../../application/services/sitemap-stream.service';

@Controller()
export class RobotsController {
  constructor(private readonly robots: RobotsPolicyService) {}

  @Public()
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  getRobotsTxt(): string {
    return this.robots.renderRobotsTxt();
  }
}

@Controller()
export class SitemapController {
  constructor(private readonly sitemap: SitemapStreamService) {}

  @Public()
  @Get('sitemap.xml')
  async getSitemap(@Res() response: Response): Promise<void> {
    await this.sitemap.pipeXml(response);
  }
}
