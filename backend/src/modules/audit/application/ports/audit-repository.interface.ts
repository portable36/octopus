import type { AuditEventRecord } from '../../domain/audit.types';

export type AuditFilterQuery = {
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
  readonly actionPrefix?: string | undefined;
  readonly action?: string | undefined;
  readonly resourceType?: string | undefined;
  readonly resourceId?: string | undefined;
  readonly actorUserId?: string | undefined;
  readonly vendorId?: string | undefined;
  readonly storeId?: string | undefined;
  readonly fromDate?: Date | undefined;
  readonly toDate?: Date | undefined;
};

export type AuditQueryResult = {
  readonly items: readonly AuditEventRecord[];
  readonly total: number;
};

export const AUDIT_REPOSITORY = Symbol('AUDIT_REPOSITORY');

export interface AuditRepository {
  append(event: AuditEventRecord): Promise<void>;
  listRecent(limit: number, actionPrefix?: string): Promise<AuditEventRecord[]>;
  query(filter: AuditFilterQuery): Promise<AuditQueryResult>;
}
