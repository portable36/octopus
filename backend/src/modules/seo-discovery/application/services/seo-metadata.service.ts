import { Inject, Injectable } from '@nestjs/common';
import type { SeoOverrideEntityType } from '../../domain/seo-override.types';
import type { RobotsDirective, SEOMetadata } from '../../domain/seo.types';
import {
  SEO_OVERRIDE_REPOSITORY,
  type SeoOverrideRepository,
} from '../ports/seo-override-repository.interface';

export interface SeoMetadataDefaults {
  readonly title: string;
  readonly description: string;
  readonly canonicalUrl: string;
  readonly noindex?: boolean;
}

export interface ResolveSeoMetadataInput {
  readonly entityType: SeoOverrideEntityType;
  readonly entityId: string;
  readonly defaults: SeoMetadataDefaults;
}

@Injectable()
export class SeoMetadataService {
  constructor(
    @Inject(SEO_OVERRIDE_REPOSITORY)
    private readonly overrides: SeoOverrideRepository,
  ) {}

  public async resolve(input: ResolveSeoMetadataInput): Promise<SEOMetadata> {
    const override = await this.overrides.findByEntity(input.entityType, input.entityId);
    const title = override?.title?.trim() || input.defaults.title;
    const description = override?.description?.trim() || input.defaults.description;
    const canonicalUrl = override?.canonicalUrl?.trim() || input.defaults.canonicalUrl;
    const noindex = override?.noindex ?? input.defaults.noindex ?? false;
    const robotsDirectives = this.buildRobotsDirectives(noindex);

    return {
      title,
      description,
      canonicalUrl,
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        type: 'website',
      },
      robotsDirectives,
    };
  }

  private buildRobotsDirectives(noindex: boolean): readonly RobotsDirective[] {
    return noindex ? ['noindex', 'follow'] : ['index', 'follow'];
  }
}
