export class AuditAccessDeniedError extends Error {
  readonly code = 'AUDIT_ACCESS_DENIED';
  constructor(message = 'Not authorized to read audit events.') {
    super(message);
    this.name = 'AuditAccessDeniedError';
  }
}
