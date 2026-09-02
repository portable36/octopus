import type { RedirectRule, RedirectStatusCode } from '../../domain/seo.types';

export const REDIRECT_REPOSITORY = Symbol('REDIRECT_REPOSITORY');

export type UpsertRedirectInput = {
  readonly sourcePath: string;
  readonly targetPath?: string | null;
  readonly statusCode: RedirectStatusCode;
};

export interface RedirectRepository {
  findBySourcePath(sourcePath: string): Promise<RedirectRule | null>;

  upsert(input: UpsertRedirectInput): Promise<RedirectRule>;

  bulkUpsert(inputs: readonly UpsertRedirectInput[]): Promise<number>;

  countBroken(): Promise<number>;
}
