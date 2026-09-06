import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { COURIER_PORT } from '../../shared-kernel/application/ports/courier.port';
import { SHIPMENT_TRACKING_PORT } from '../../shared-kernel/application/ports/shipment-tracking.port';
import { SHIPPING_CONFIG_PROVISIONER } from '../../shared-kernel/application/ports/shipping-config-provisioner.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import {
  CreateShipmentHandler,
  MarkShipmentDeliveredManualHandler,
  SyncShipmentStatusHandler,
} from './application/commands/fulfillment.handlers';
import { ProcessCourierWebhookHandler } from './application/commands/fulfillment-webhook.handlers';
import { FULFILLMENT_REPOSITORY } from './application/ports/fulfillment-repository.interface';
import { FulfillmentAuthorizationService } from './application/services/fulfillment-authorization.service';
import { CourierPortAdapter } from './infrastructure/access/courier-port.adapter';
import { ShipmentTrackingAdapter } from './infrastructure/access/shipment-tracking-port.adapter';
import { ShippingConfigProvisionerAdapter } from './infrastructure/access/shipping-config-provisioner.adapter';
import { PathaoCourierClient } from './infrastructure/integrations/pathao.client';
import { SteadfastCourierClient } from './infrastructure/integrations/steadfast.client';
import { CourierAccountStore } from './infrastructure/persistence/courier-account.store';
import {
  CourierAccountOrmEntity,
  CourierOauthTokenOrmEntity,
  FulfillmentOperationOrmEntity,
  FulfillmentOutboxOrmEntity,
  ShipmentLineOrmEntity,
  ShipmentOrmEntity,
} from './infrastructure/persistence/fulfillment.orm-entity';
import { FulfillmentRepositoryAdapter } from './infrastructure/persistence/fulfillment.repository.adapter';
import { FulfillmentStatusPollerService } from './jobs/fulfillment-status-poller.service';
import { FulfillmentController } from './presentation/http/fulfillment.controller';
import { FulfillmentWebhookController } from './presentation/http/fulfillment-webhook.controller';

@Global()
@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([
      ShipmentOrmEntity,
      ShipmentLineOrmEntity,
      CourierAccountOrmEntity,
      CourierOauthTokenOrmEntity,
      FulfillmentOperationOrmEntity,
      FulfillmentOutboxOrmEntity,
    ]),
  ],
  controllers: [FulfillmentController, FulfillmentWebhookController],
  providers: [
    FulfillmentAuthorizationService,
    CreateShipmentHandler,
    SyncShipmentStatusHandler,
    MarkShipmentDeliveredManualHandler,
    ProcessCourierWebhookHandler,
    FulfillmentStatusPollerService,
    CourierAccountStore,
    SteadfastCourierClient,
    PathaoCourierClient,
    { provide: FULFILLMENT_REPOSITORY, useClass: FulfillmentRepositoryAdapter },
    { provide: COURIER_PORT, useClass: CourierPortAdapter },
    { provide: SHIPMENT_TRACKING_PORT, useClass: ShipmentTrackingAdapter },
    { provide: SHIPPING_CONFIG_PROVISIONER, useClass: ShippingConfigProvisionerAdapter },
  ],
  exports: [
    COURIER_PORT,
    SHIPMENT_TRACKING_PORT,
    FULFILLMENT_REPOSITORY,
    SHIPPING_CONFIG_PROVISIONER,
    FulfillmentStatusPollerService,
    ProcessCourierWebhookHandler,
  ],
})
export class FulfillmentModule {}
