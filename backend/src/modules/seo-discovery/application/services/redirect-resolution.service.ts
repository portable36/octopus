import { Inject, Injectable } from '@nestjs/common';
import type { RedirectRule } from '../../domain/seo.types';
import { normalizeRequestPath } from '../../domain/normalize-path';
import {
  REDIRECT_REPOSITORY,
  type RedirectRepository,
} from '../ports/redirect-repository.interface';

@Injectable()
export class RedirectResolutionService {
  constructor(@Inject(REDIRECT_REPOSITORY) private readonly redirects: RedirectRepository) {}

  public async resolve(sourcePath: string): Promise<RedirectRule | null> {
    const normalized = normalizeRequestPath(sourcePath);
    return this.redirects.findBySourcePath(normalized);
  }
}
