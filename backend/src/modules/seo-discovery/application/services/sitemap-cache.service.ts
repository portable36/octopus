import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import { SITEMAP_SOURCE, type SitemapSourcePort } from '../ports/sitemap-source.port';
import { buildSitemapXml } from './sitemap-xml.renderer';

const SITEMAP_FILENAME = 'sitemap.xml';

@Injectable()
export class SitemapCacheService {
  private readonly logger = new Logger(SitemapCacheService.name);
  private memoryCache: Buffer | null = null;

  constructor(
    @Inject(SITEMAP_SOURCE) private readonly source: SitemapSourcePort,
    private readonly config: AppConfigService,
  ) {}

  public getCachedBuffer(): Buffer | null {
    return this.memoryCache;
  }

  public async refresh(batchSize?: number): Promise<void> {
    const chunkSize = batchSize ?? this.config.sitemapItemsPerChunk;
    const xml = await buildSitemapXml((size) => this.source.streamEntries(size), chunkSize);
    const buffer = Buffer.from(xml, 'utf8');
    this.memoryCache = buffer;

    const filePath = this.sitemapFilePath();
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    this.logger.log(`Sitemap cache refreshed (${buffer.byteLength} bytes).`);
  }

  public async loadFromDisk(): Promise<Buffer | null> {
    try {
      const buffer = await readFile(this.sitemapFilePath());
      this.memoryCache = buffer;
      return buffer;
    } catch {
      return null;
    }
  }

  private sitemapFilePath(): string {
    return join(this.config.seoCacheDir, SITEMAP_FILENAME);
  }
}
