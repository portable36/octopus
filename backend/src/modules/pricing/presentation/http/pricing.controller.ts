import { Body, Controller, Get, HttpCode, Param, Post, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import {
  PricingQuoteHandler,
  PromotionCommandHandler,
} from '../../application/commands/pricing.handlers';
import type { Promotion } from '../../domain/aggregates/promotion.aggregate';
import {
  CreatePromotionRequestDto,
  QuoteRequestDto,
  RecordUsageRequestDto,
} from './dto/pricing.dto';
import { PricingExceptionFilter } from './filters/pricing-exception.filter';

@ApiTags('pricing')
@Controller('pricing')
@ApiBearerAuth()
@UseFilters(PricingExceptionFilter)
export class PricingController {
  constructor(
    private readonly promotions: PromotionCommandHandler,
    private readonly quotes: PricingQuoteHandler,
  ) {}

  @Post('stores/:storeId/promotions')
  @ApiOperation({ summary: 'Create a store promotion or coupon' })
  async createPromotion(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: CreatePromotionRequestDto,
  ) {
    const promotion = await this.promotions.create({
      storeId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      name: body.name,
      discountType: body.discountType,
      discountValue: body.discountValue,
      currencyCode: body.currencyCode,
      scope: body.scope,
      startsAt: new Date(body.startsAt),
      ...(body.couponCode !== undefined ? { couponCode: body.couponCode } : {}),
      ...(body.minOrderAmountMinor !== undefined
        ? { minOrderAmountMinor: body.minOrderAmountMinor }
        : {}),
      ...(body.scopeIds !== undefined ? { scopeIds: body.scopeIds } : {}),
      ...(body.usageLimit !== undefined ? { usageLimit: body.usageLimit } : {}),
      ...(body.perCustomerLimit !== undefined ? { perCustomerLimit: body.perCustomerLimit } : {}),
      ...(body.endsAt !== undefined ? { endsAt: new Date(body.endsAt) } : {}),
      ...(body.activate !== undefined ? { activate: body.activate } : {}),
    });
    return this.promotionResponse(promotion);
  }

  @Get('stores/:storeId/promotions')
  @ApiOperation({ summary: 'List promotions for a store' })
  async listPromotions(@CurrentUser() user: RequestPrincipal, @Param('storeId') storeId: string) {
    const list = await this.promotions.list({
      storeId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return list.map((promotion) => this.promotionResponse(promotion));
  }

  @Post('stores/:storeId/promotions/:promotionId/activate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Activate a promotion' })
  async activate(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Param('promotionId') promotionId: string,
  ) {
    const promotion = await this.promotions.activate({
      storeId,
      promotionId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return this.promotionResponse(promotion);
  }

  @Post('stores/:storeId/promotions/:promotionId/disable')
  @HttpCode(200)
  @ApiOperation({ summary: 'Disable a promotion' })
  async disable(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Param('promotionId') promotionId: string,
  ) {
    const promotion = await this.promotions.disable({
      storeId,
      promotionId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return this.promotionResponse(promotion);
  }

  @Post('quote')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Authoritative price quote (backend totals; never trust browser totals)',
  })
  async quote(@Body() body: QuoteRequestDto) {
    return this.quotes.quote({
      vendorId: body.vendorId,
      storeId: body.storeId,
      currencyCode: body.currencyCode,
      lines: body.lines,
      ...(body.shippingMinor !== undefined ? { shippingMinor: body.shippingMinor } : {}),
      ...(body.taxRateBps !== undefined ? { taxRateBps: body.taxRateBps } : {}),
      ...(body.commissionRateBps !== undefined
        ? { commissionRateBps: body.commissionRateBps }
        : {}),
      ...(body.couponCode !== undefined ? { couponCode: body.couponCode } : {}),
      ...(body.customerId !== undefined ? { customerId: body.customerId } : {}),
    });
  }

  @Post('promotions/usage')
  @HttpCode(200)
  @ApiOperation({ summary: 'Record promotion usage idempotently (checkout/order seam)' })
  async recordUsage(@Body() body: RecordUsageRequestDto) {
    await this.quotes.recordUsage({
      promotionId: body.promotionId,
      orderId: body.orderId,
      idempotencyKey: body.idempotencyKey,
      ...(body.customerId !== undefined ? { customerId: body.customerId } : {}),
    });
    return { recorded: true };
  }

  private promotionResponse(promotion: Promotion) {
    return {
      id: promotion.id.value,
      vendorId: promotion.vendorId,
      storeId: promotion.storeId,
      name: promotion.name,
      couponCode: promotion.couponCode,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      currencyCode: promotion.currencyCode,
      minOrderAmountMinor: promotion.minOrderAmountMinor,
      scope: promotion.scope,
      scopeIds: [...promotion.scopeIds],
      usageLimit: promotion.usageLimit,
      usageCount: promotion.usageCount,
      perCustomerLimit: promotion.perCustomerLimit,
      startsAt: promotion.startsAt.toISOString(),
      endsAt: promotion.endsAt?.toISOString() ?? null,
      status: promotion.status,
    };
  }
}
