import { Injectable } from '@nestjs/common';
import type {
  NotificationConfigProvisionerPort,
  NotificationConfigProvisionInput,
  ProvisionerResult,
} from '../../../../shared-kernel/application/ports/notification-config-provisioner.port';

@Injectable()
export class NotificationConfigProvisionerAdapter implements NotificationConfigProvisionerPort {
  public async provision(_input: NotificationConfigProvisionInput): Promise<ProvisionerResult> {
    return { success: true };
  }
}
