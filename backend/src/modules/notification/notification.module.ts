import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { NOTIFICATION_OUTBOX_HANDLER } from '../../shared-kernel/application/ports/notification-outbox-handler.port';
import { NOTIFICATION_PORT } from '../../shared-kernel/application/ports/notification.port';
import { NOTIFICATION_CONFIG_PROVISIONER } from '../../shared-kernel/application/ports/notification-config-provisioner.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { NotificationEventConsumer } from './application/commands/notification-event.consumer';
import { NotificationHandlers } from './application/commands/notification.handlers';
import { EMAIL_PROVIDER } from './application/ports/email-provider.port';
import { NOTIFICATION_DELIVERY_ENQUEUER } from './application/ports/notification-delivery-enqueuer.port';
import { NOTIFICATION_REPOSITORY } from './application/ports/notification-repository.interface';
import { NotificationDeliveryEnqueuerAdapter } from './infrastructure/bullmq/notification-delivery-enqueuer.adapter';
import { LogEmailProviderAdapter } from './infrastructure/email/log-email.provider.adapter';
import { NotificationConfigProvisionerAdapter } from './infrastructure/access/notification-config-provisioner.adapter';
import { NotificationDeliveryAttemptOrmEntity } from './infrastructure/persistence/notification-delivery-attempt.orm-entity';
import { NotificationOrmEntity } from './infrastructure/persistence/notification.orm-entity';
import { NotificationPreferenceOrmEntity } from './infrastructure/persistence/notification-preference.orm-entity';
import { NotificationRepositoryAdapter } from './infrastructure/persistence/notification.repository.adapter';
import { NotificationTemplateOrmEntity } from './infrastructure/persistence/notification-template.orm-entity';
import { NotificationController } from './presentation/http/notification.controller';

@Global()
@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([
      NotificationOrmEntity,
      NotificationTemplateOrmEntity,
      NotificationDeliveryAttemptOrmEntity,
      NotificationPreferenceOrmEntity,
    ]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationHandlers,
    NotificationEventConsumer,
    NotificationRepositoryAdapter,
    LogEmailProviderAdapter,
    NotificationDeliveryEnqueuerAdapter,
    NotificationConfigProvisionerAdapter,
    { provide: NOTIFICATION_REPOSITORY, useExisting: NotificationRepositoryAdapter },
    { provide: EMAIL_PROVIDER, useExisting: LogEmailProviderAdapter },
    { provide: NOTIFICATION_DELIVERY_ENQUEUER, useExisting: NotificationDeliveryEnqueuerAdapter },
    { provide: NOTIFICATION_PORT, useExisting: NotificationHandlers },
    { provide: NOTIFICATION_OUTBOX_HANDLER, useExisting: NotificationEventConsumer },
    { provide: NOTIFICATION_CONFIG_PROVISIONER, useExisting: NotificationConfigProvisionerAdapter },
  ],
  exports: [
    NOTIFICATION_PORT,
    NOTIFICATION_OUTBOX_HANDLER,
    NOTIFICATION_CONFIG_PROVISIONER,
    NotificationHandlers,
  ],
})
export class NotificationModule {}
