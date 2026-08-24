import type { AuditEventRecord } from '../../domain/audit.types';

export const AUDIT_REPOSITORY = Symbol('AUDIT_REPOSITORY');

export interface AuditRepository {
  append(event: AuditEventRecord): Promise<void>;
  listRecent(limit: number): Promise<AuditEventRecord[]>;
}
