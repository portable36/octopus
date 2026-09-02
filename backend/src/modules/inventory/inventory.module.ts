import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { INVENTORY_PORT } from '../../shared-kernel/application/ports/inventory.port';
import { WAREHOUSE_PROVISIONER } from '../../shared-kernel/application/ports/warehouse-provisioner.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import {
  ReservationCommandHandler,
  StockCommandHandler,
  WarehouseCommandHandler,
} from './application/commands/inventory.handlers';
import { INVENTORY_REPOSITORY } from './application/ports/inventory-repository.interface';
import { WAREHOUSE_REPOSITORY } from './application/ports/warehouse-repository.interface';
import { InventoryAuthorizationService } from './application/services/inventory-authorization.service';
import { InventoryPortAdapter } from './infrastructure/access/inventory-port.adapter';
import { WarehouseProvisionerAdapter } from './infrastructure/access/warehouse-provisioner.adapter';
import { InventoryItemOrmEntity } from './infrastructure/persistence/inventory-item.orm-entity';
import { InventoryMovementOrmEntity } from './infrastructure/persistence/inventory-movement.orm-entity';
import { InventoryOperationOrmEntity } from './infrastructure/persistence/inventory-operation.orm-entity';
import { InventoryOutboxOrmEntity } from './infrastructure/persistence/inventory-outbox.orm-entity';
import { InventoryReservationOrmEntity } from './infrastructure/persistence/inventory-reservation.orm-entity';
import { InventoryRepositoryAdapter } from './infrastructure/persistence/inventory.repository.adapter';
import { WarehouseOrmEntity } from './infrastructure/persistence/warehouse.orm-entity';
import { WarehouseRepositoryAdapter } from './infrastructure/persistence/warehouse.repository.adapter';
import { InventoryController } from './presentation/http/inventory.controller';

@Global()
@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([
      WarehouseOrmEntity,
      InventoryItemOrmEntity,
      InventoryReservationOrmEntity,
      InventoryMovementOrmEntity,
      InventoryOperationOrmEntity,
      InventoryOutboxOrmEntity,
    ]),
  ],
  controllers: [InventoryController],
  providers: [
    InventoryAuthorizationService,
    WarehouseCommandHandler,
    StockCommandHandler,
    ReservationCommandHandler,
    { provide: WAREHOUSE_REPOSITORY, useClass: WarehouseRepositoryAdapter },
    { provide: INVENTORY_REPOSITORY, useClass: InventoryRepositoryAdapter },
    { provide: INVENTORY_PORT, useClass: InventoryPortAdapter },
    { provide: WAREHOUSE_PROVISIONER, useClass: WarehouseProvisionerAdapter },
  ],
  exports: [INVENTORY_PORT, INVENTORY_REPOSITORY, WAREHOUSE_REPOSITORY, WAREHOUSE_PROVISIONER, ReservationCommandHandler],
})
export class InventoryModule {}
