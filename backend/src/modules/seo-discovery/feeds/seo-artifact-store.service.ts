import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { WriteStream } from 'node:fs';
import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../config/app-config.service';

@Injectable()
export class SeoArtifactStoreService {
  constructor(private readonly config: AppConfigService) {}

  public async writeFeed(relativePath: string, content: string | Buffer): Promise<string> {
    const absolutePath = join(this.config.seoCacheDir, 'feeds', relativePath);
    await mkdir(join(this.config.seoCacheDir, 'feeds'), { recursive: true });
    await writeFile(absolutePath, content);
    return absolutePath;
  }

  /** Open a disk stream so feed generators can write batches without buffering the full catalog. */
  public async openFeedWriteStream(relativePath: string): Promise<{
    readonly path: string;
    readonly stream: WriteStream;
  }> {
    const absolutePath = join(this.config.seoCacheDir, 'feeds', relativePath);
    await mkdir(join(this.config.seoCacheDir, 'feeds'), { recursive: true });
    return {
      path: absolutePath,
      stream: createWriteStream(absolutePath, { encoding: 'utf8' }),
    };
  }
}
