import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { COURIER_PORT } from '../../shared-kernel/application/ports/courier.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import {
  CreateShipmentHandler,
  MarkShipmentDeliveredManualHandler,
  SyncShipmentStatusHandler,
} from './application/commands/fulfillment.handlers';
import { FULFILLMENT_REPOSITORY } from './application/ports/fulfillment-repository.interface';
import { FulfillmentAuthorizationService } from './application/services/fulfillment-authorization.service';
import { CourierPortAdapter } from './infrastructure/access/courier-port.adapter';
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
import { FulfillmentController } from './presentation/http/fulfillment.controller';

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
  controllers: [FulfillmentController],
  providers: [
    FulfillmentAuthorizationService,
    CreateShipmentHandler,
    SyncShipmentStatusHandler,
    MarkShipmentDeliveredManualHandler,
    CourierAccountStore,
    SteadfastCourierClient,
    PathaoCourierClient,
    { provide: FULFILLMENT_REPOSITORY, useClass: FulfillmentRepositoryAdapter },
    { provide: COURIER_PORT, useClass: CourierPortAdapter },
  ],
  exports: [COURIER_PORT, FULFILLMENT_REPOSITORY],
})
export class FulfillmentModule {}
