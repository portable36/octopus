export const SEO_HEALTH_VERIFICATION_PORT = Symbol('SEO_HEALTH_VERIFICATION_PORT');

export type SeoHealthIssueDto = {
  readonly id: string;
  readonly url: string;
  readonly issueType: string;
  readonly severity: string;
  readonly detail: string;
  readonly scannedAt: Date;
};

export interface SeoHealthVerificationPort {
  verifyTopProductRoutes(): Promise<{ readonly scanned: number; readonly issues: number }>;
  countOpenIssues(): Promise<number>;
  latestScanAt(): Promise<Date | null>;
  listIssues(limit?: number): Promise<readonly SeoHealthIssueDto[]>;
}
