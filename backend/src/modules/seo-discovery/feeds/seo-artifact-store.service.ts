import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
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
}
