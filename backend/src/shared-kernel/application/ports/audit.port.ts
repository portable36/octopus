export const AUDIT_PORT = Symbol('AUDIT_PORT');

export type AuditAppendInput = {
  readonly actorUserId: string | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId?: string | null;
  readonly vendorId?: string | null;
  readonly storeId?: string | null;
  readonly requestId?: string | null;
  readonly before?: Record<string, unknown> | null;
  readonly after?: Record<string, unknown> | null;
  readonly metadata?: Record<string, unknown> | null;
};

/** Cross-module append-only audit sink (implemented by Audit module). */
export interface AuditPort {
  append(input: AuditAppendInput): Promise<void>;
}
