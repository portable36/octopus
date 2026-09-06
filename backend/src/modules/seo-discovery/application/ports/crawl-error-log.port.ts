export const CRAWL_ERROR_LOG_PORT = Symbol('CRAWL_ERROR_LOG_PORT');

export type CrawlErrorEntryDto = {
  readonly id: string;
  readonly requestPath: string;
  readonly httpMethod: string;
  readonly occurredAt: Date;
};

export interface CrawlErrorLogPort {
  logNotFound(input: {
    readonly requestPath: string;
    readonly httpMethod?: string;
    readonly userAgent?: string | null;
  }): Promise<void>;
  countRecent(hours?: number): Promise<number>;
  listRecent(limit?: number): Promise<readonly CrawlErrorEntryDto[]>;
}
