import type { SeoOverrideEntityType, SeoOverrideFields } from '../../domain/seo-override.types';

export const SEO_OVERRIDE_REPOSITORY = Symbol('SEO_OVERRIDE_REPOSITORY');

export type UpsertSeoOverrideInput = {
  readonly entityType: SeoOverrideEntityType;
  readonly entityId: string;
  readonly title?: string | null;
  readonly description?: string | null;
  readonly noindex?: boolean | null;
  readonly canonicalUrl?: string | null;
};

export interface SeoOverrideRepository {
  findByEntity(
    entityType: SeoOverrideEntityType,
    entityId: string,
  ): Promise<SeoOverrideFields | null>;

  upsert(input: UpsertSeoOverrideInput): Promise<SeoOverrideFields>;

  countMissingMetadata(): Promise<number>;
}
