import { Inject, Injectable } from '@nestjs/common';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { redactSecrets } from '../../domain/services/redact-secrets';
import { AuditAccessDeniedError } from '../errors/audit.errors';
import { AUDIT_REPOSITORY, type AuditRepository } from '../ports/audit-repository.interface';

@Injectable()
export class AuditHandlers {
  constructor(@Inject(AUDIT_REPOSITORY) private readonly audits: AuditRepository) {}

  public async append(input: {
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
  }): Promise<void> {
    await this.audits.append({
      id: UniqueID.create().value,
      actorUserId: input.actorUserId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      vendorId: input.vendorId ?? null,
      storeId: input.storeId ?? null,
      requestId: input.requestId ?? null,
      before: redactSecrets(input.before),
      after: redactSecrets(input.after),
      metadata: redactSecrets(input.metadata),
      createdAt: new Date(),
    });
  }

  public async listRecent(actorRoles: readonly string[], limit = 50) {
    if (!actorRoles.includes('PLATFORM_ADMIN')) {
      throw new AuditAccessDeniedError('Missing permission audit.read.');
    }
    return this.audits.listRecent(Math.min(Math.max(limit, 1), 100));
  }
}
