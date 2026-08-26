import { Body, Controller, Get, HttpCode, Param, Post, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import {
  ReservationCommandHandler,
  StockCommandHandler,
  WarehouseCommandHandler,
} from '../../application/commands/inventory.handlers';
import type { InventoryItem } from '../../domain/aggregates/inventory-item.aggregate';
import type { Warehouse } from '../../domain/aggregates/warehouse.aggregate';
import {
  AdjustStockRequestDto,
  CreateWarehouseRequestDto,
  EnsureInventoryItemRequestDto,
  ReceiveStockRequestDto,
  ReservationActionRequestDto,
  ReserveStockRequestDto,
  TransferStockRequestDto,
} from './dto/inventory.dto';
import { InventoryExceptionFilter } from './filters/inventory-exception.filter';

@ApiTags('inventory')
@Controller('inventory')
@ApiBearerAuth()
@UseFilters(InventoryExceptionFilter)
export class InventoryController {
  constructor(
    private readonly warehouses: WarehouseCommandHandler,
    private readonly stock: StockCommandHandler,
    private readonly reservations: ReservationCommandHandler,
  ) {}

  @Post('stores/:storeId/warehouses')
  @ApiOperation({ summary: 'Create a warehouse for a store' })
  async createWarehouse(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: CreateWarehouseRequestDto,
  ) {
    const warehouse = await this.warehouses.create({
      storeId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      code: body.code,
      name: body.name,
      ...(body.addressLine !== undefined ? { addressLine: body.addressLine } : {}),
    });
    return this.warehouseResponse(warehouse);
  }

  @Get('stores/:storeId/warehouses')
  @ApiOperation({ summary: 'List warehouses for a store' })
  async listWarehouses(@CurrentUser() user: RequestPrincipal, @Param('storeId') storeId: string) {
    const list = await this.warehouses.list(storeId, user.userId, user.roles);
    return list.map((warehouse) => this.warehouseResponse(warehouse));
  }

  @Post('stores/:storeId/items')
  @ApiOperation({ summary: 'Ensure an inventory item exists for warehouse + variant' })
  async ensureItem(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: EnsureInventoryItemRequestDto,
  ) {
    const item = await this.stock.ensureItem({
      storeId,
      warehouseId: body.warehouseId,
      variantId: body.variantId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      ...(body.lowStockThreshold !== undefined
        ? { lowStockThreshold: body.lowStockThreshold }
        : {}),
    });
    return this.itemResponse(item);
  }

  @Post('stores/:storeId/receive')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive stock into a warehouse' })
  async receive(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: ReceiveStockRequestDto,
  ) {
    const item = await this.stock.receive({
      storeId,
      warehouseId: body.warehouseId,
      variantId: body.variantId,
      quantity: body.quantity,
      actorUserId: user.userId,
      actorRoles: user.roles,
      idempotencyKey: body.idempotencyKey,
      ...(body.reason !== undefined ? { reason: body.reason } : {}),
    });
    return this.itemResponse(item);
  }

  @Post('stores/:storeId/adjust')
  @HttpCode(200)
  @ApiOperation({ summary: 'Adjust on-hand stock with a reason' })
  async adjust(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: AdjustStockRequestDto,
  ) {
    const item = await this.stock.adjust({
      storeId,
      warehouseId: body.warehouseId,
      variantId: body.variantId,
      delta: body.delta,
      reason: body.reason,
      actorUserId: user.userId,
      actorRoles: user.roles,
      idempotencyKey: body.idempotencyKey,
    });
    return this.itemResponse(item);
  }

  @Post('stores/:storeId/transfer')
  @HttpCode(200)
  @ApiOperation({ summary: 'Immediate transfer between warehouses in the same store' })
  async transfer(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: TransferStockRequestDto,
  ) {
    const result = await this.stock.transfer({
      storeId,
      sourceWarehouseId: body.sourceWarehouseId,
      destinationWarehouseId: body.destinationWarehouseId,
      variantId: body.variantId,
      quantity: body.quantity,
      actorUserId: user.userId,
      actorRoles: user.roles,
      idempotencyKey: body.idempotencyKey,
    });
    return {
      source: this.itemResponse(result.source),
      destination: this.itemResponse(result.destination),
    };
  }

  @Post('stores/:storeId/reserve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reserve available stock for an order hold' })
  async reserve(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: ReserveStockRequestDto,
  ) {
    return this.reservations.reserve({
      storeId,
      warehouseId: body.warehouseId,
      variantId: body.variantId,
      quantity: body.quantity,
      orderId: body.orderId,
      expiresAt: new Date(body.expiresAt),
      actorUserId: user.userId,
      actorRoles: user.roles,
      idempotencyKey: body.idempotencyKey,
    });
  }

  @Post('reservations/:reservationId/release')
  @HttpCode(200)
  @ApiOperation({ summary: 'Release an active reservation' })
  async release(
    @CurrentUser() user: RequestPrincipal,
    @Param('reservationId') reservationId: string,
    @Body() body: ReservationActionRequestDto,
  ) {
    await this.reservations.release({
      reservationId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      idempotencyKey: body.idempotencyKey,
    });
    return { ok: true };
  }

  @Post('reservations/:reservationId/commit')
  @HttpCode(200)
  @ApiOperation({ summary: 'Commit reservation (deduct on-hand after order confirmation)' })
  async commit(
    @CurrentUser() user: RequestPrincipal,
    @Param('reservationId') reservationId: string,
    @Body() body: ReservationActionRequestDto,
  ) {
    await this.reservations.commit({
      reservationId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      idempotencyKey: body.idempotencyKey,
    });
    return { ok: true };
  }

  @Post('reservations/expire-due')
  @HttpCode(200)
  @ApiOperation({ summary: 'Expire due ACTIVE reservations (idempotent batch)' })
  async expireDue(@CurrentUser() user: RequestPrincipal) {
    const allowed =
      user.roles.includes('PLATFORM_ADMIN') ||
      user.roles.includes('VENDOR_OWNER') ||
      user.roles.includes('STORE_MANAGER');
    if (!allowed) {
      return { expired: 0, skipped: true };
    }
    const expired = await this.reservations.expireDue(100);
    return { expired };
  }

  @Get('stores/:storeId/availability')
  @ApiOperation({ summary: 'Lookup stock for a variant across authorized store warehouses' })
  @ApiQuery({ name: 'variantId', required: true })
  async availability(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Query('variantId') variantId: string,
  ) {
    return this.stock.getAvailability({
      storeId,
      variantId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
  }

  @Get('stores/:storeId/items')
  @ApiOperation({ summary: 'List inventory items for a store (authorized readers)' })
  @ApiQuery({ name: 'limit', required: false })
  async listItems(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = Number.parseInt(limit ?? '', 10);
    const capped = Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 200) : 50;
    const list = await this.stock.listByStore({
      storeId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      limit: capped,
    });
    return list.map((item) => this.itemResponse(item));
  }

  private warehouseResponse(warehouse: Warehouse) {
    return {
      id: warehouse.id.value,
      vendorId: warehouse.vendorId,
      storeId: warehouse.storeId,
      code: warehouse.code,
      name: warehouse.name,
      status: warehouse.status,
      addressLine: warehouse.addressLine,
      createdAt: warehouse.createdAt.toISOString(),
      updatedAt: warehouse.updatedAt.toISOString(),
    };
  }

  private itemResponse(item: InventoryItem) {
    return {
      id: item.id.value,
      vendorId: item.vendorId,
      storeId: item.storeId,
      warehouseId: item.warehouseId,
      variantId: item.variantId,
      onHand: item.onHand,
      reserved: item.reserved,
      available: item.available,
      lowStockThreshold: item.lowStockThreshold,
      status: item.status,
      version: item.version,
    };
  }
}
