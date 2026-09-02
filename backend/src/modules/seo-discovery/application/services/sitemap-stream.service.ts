import { Inject, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import {
  SITEMAP_SOURCE,
  type SitemapSourcePort,
} from '../ports/sitemap-source.port';
import { SitemapCacheService } from './sitemap-cache.service';
import { renderSitemapUrl } from './sitemap-xml.renderer';

const DEFAULT_BATCH_SIZE = 500;

@Injectable()
export class SitemapStreamService {
  constructor(
    @Inject(SITEMAP_SOURCE) private readonly source: SitemapSourcePort,
    private readonly cache: SitemapCacheService,
  ) {}

  public async pipeXml(response: Response, batchSize = DEFAULT_BATCH_SIZE): Promise<void> {
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Cache-Control', 'public, max-age=300');

    const cached = this.cache.getCachedBuffer() ?? (await this.cache.loadFromDisk());
    if (cached) {
      response.end(cached);
      return;
    }

    response.write('<?xml version="1.0" encoding="UTF-8"?>\n');
    response.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n');

    for await (const batch of this.source.streamEntries(batchSize)) {
      for (const entry of batch) {
        response.write(renderSitemapUrl(entry));
      }
    }

    response.write('</urlset>\n');
    response.end();
  }
}
