import { Injectable } from '@nestjs/common';
import type {
  AuditAppendInput,
  AuditPort,
} from '../../../../shared-kernel/application/ports/audit.port';
import { AuditHandlers } from '../../application/commands/audit.handlers';

@Injectable()
export class AuditPortAdapter implements AuditPort {
  constructor(private readonly audit: AuditHandlers) {}

  public async append(input: AuditAppendInput): Promise<void> {
    await this.audit.append(input);
  }
}
