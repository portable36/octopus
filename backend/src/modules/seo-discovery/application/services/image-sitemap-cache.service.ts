import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import {
  IMAGE_SITEMAP_SOURCE,
  type ImageSitemapSourcePort,
} from '../ports/image-sitemap-source.port';
import { ImageSitemapGenerator } from '../../sitemap/image-sitemap.generator';

const IMAGE_SITEMAP_RELATIVE_PATH = join('sitemaps', 'images.xml');

@Injectable()
export class ImageSitemapCacheService {
  private readonly logger = new Logger(ImageSitemapCacheService.name);
  private memoryCache: Buffer | null = null;
  private readonly generator = new ImageSitemapGenerator();

  constructor(
    @Inject(IMAGE_SITEMAP_SOURCE) private readonly source: ImageSitemapSourcePort,
    private readonly config: AppConfigService,
  ) {}

  public getCachedBuffer(): Buffer | null {
    return this.memoryCache;
  }

  public async refresh(batchSize?: number): Promise<void> {
    const chunkSize = batchSize ?? this.config.sitemapItemsPerChunk;
    const xml = await this.generator.build(
      (size) => this.source.streamEntries(size),
      chunkSize,
    );
    const buffer = Buffer.from(xml, 'utf8');
    this.memoryCache = buffer;

    const filePath = this.imageSitemapFilePath();
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    this.logger.log(`Image sitemap cache refreshed (${buffer.byteLength} bytes).`);
  }

  public async loadFromDisk(): Promise<Buffer | null> {
    try {
      const buffer = await readFile(this.imageSitemapFilePath());
      this.memoryCache = buffer;
      return buffer;
    } catch {
      return null;
    }
  }

  private imageSitemapFilePath(): string {
    return join(this.config.seoCacheDir, IMAGE_SITEMAP_RELATIVE_PATH);
  }
}
