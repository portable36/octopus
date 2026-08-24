import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  UseFilters,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { Public } from '../../../../shared-kernel/presentation/http/public.decorator';
import { setGuestToken } from '../../../../shared-kernel/infrastructure/context/tenant-context.storage';
import { CartCommandHandler, type CartOwner } from '../../application/commands/cart.handlers';
import type { Cart } from '../../domain/aggregates/cart.aggregate';
import { CartAccessDeniedError } from '../../application/errors/cart.errors';
import { AddCartItemDto, RecalculateCartDto, UpdateCartQuantityDto } from './dto/cart.dto';
import { CartExceptionFilter } from './filters/cart-exception.filter';

@ApiTags('cart')
@Controller('cart')
@ApiBearerAuth()
@ApiHeader({ name: 'x-guest-token', required: false })
@UseFilters(CartExceptionFilter)
export class CartController {
  constructor(private readonly carts: CartCommandHandler) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Get or create the active cart for customer or guest' })
  async getOrCreate(
    @CurrentUser() user: RequestPrincipal | undefined,
    @Headers('x-guest-token') guestToken?: string,
  ) {
    const owner = this.resolveOwner(user, guestToken);
    this.applyGuestRls(owner);
    const cart = await this.carts.getOrCreate(owner);
    return this.cartResponse(cart);
  }

  @Public()
  @Get(':cartId')
  @ApiOperation({ summary: 'Get a cart by id' })
  async get(
    @CurrentUser() user: RequestPrincipal | undefined,
    @Param('cartId') cartId: string,
    @Headers('x-guest-token') guestToken?: string,
  ) {
    const owner = this.resolveOwner(user, guestToken);
    this.applyGuestRls(owner);
    const cart = await this.carts.get(cartId, owner);
    return this.cartResponse(cart);
  }

  @Public()
  @Post(':cartId/items')
  @ApiOperation({ summary: 'Add a store offer line to the cart' })
  async addItem(
    @CurrentUser() user: RequestPrincipal | undefined,
    @Param('cartId') cartId: string,
    @Headers('x-guest-token') guestToken: string | undefined,
    @Body() body: AddCartItemDto,
  ) {
    const owner = this.resolveOwner(user, guestToken);
    this.applyGuestRls(owner);
    const cart = await this.carts.addItem({
      cartId,
      owner,
      storeId: body.storeId,
      variantId: body.variantId,
      quantity: body.quantity,
    });
    return this.cartResponse(cart);
  }

  @Public()
  @Patch(':cartId/items/:lineId')
  @ApiOperation({ summary: 'Update cart line quantity' })
  async updateQuantity(
    @CurrentUser() user: RequestPrincipal | undefined,
    @Param('cartId') cartId: string,
    @Param('lineId') lineId: string,
    @Headers('x-guest-token') guestToken: string | undefined,
    @Body() body: UpdateCartQuantityDto,
  ) {
    const owner = this.resolveOwner(user, guestToken);
    this.applyGuestRls(owner);
    const cart = await this.carts.updateQuantity({
      cartId,
      owner,
      lineId,
      quantity: body.quantity,
    });
    return this.cartResponse(cart);
  }

  @Public()
  @Delete(':cartId/items/:lineId')
  @ApiOperation({ summary: 'Remove a cart line (idempotent)' })
  async removeItem(
    @CurrentUser() user: RequestPrincipal | undefined,
    @Param('cartId') cartId: string,
    @Param('lineId') lineId: string,
    @Headers('x-guest-token') guestToken?: string,
  ) {
    const owner = this.resolveOwner(user, guestToken);
    this.applyGuestRls(owner);
    const cart = await this.carts.removeItem({ cartId, owner, lineId });
    return this.cartResponse(cart);
  }

  @Public()
  @Post(':cartId/clear')
  @HttpCode(200)
  @ApiOperation({ summary: 'Clear all cart lines' })
  async clear(
    @CurrentUser() user: RequestPrincipal | undefined,
    @Param('cartId') cartId: string,
    @Headers('x-guest-token') guestToken?: string,
  ) {
    const owner = this.resolveOwner(user, guestToken);
    this.applyGuestRls(owner);
    const cart = await this.carts.clear({ cartId, owner });
    return this.cartResponse(cart);
  }

  @Public()
  @Post(':cartId/validate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Validate offers, prices, and store inventory for checkout readiness' })
  async validate(
    @CurrentUser() user: RequestPrincipal | undefined,
    @Param('cartId') cartId: string,
    @Headers('x-guest-token') guestToken?: string,
  ) {
    const owner = this.resolveOwner(user, guestToken);
    this.applyGuestRls(owner);
    const result = await this.carts.validate({ cartId, owner });
    return {
      cart: this.cartResponse(result.cart),
      valid: result.valid,
      issues: result.issues,
    };
  }

  @Public()
  @Post(':cartId/recalculate')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Recalculate display totals via PricingPort (hints only; checkout is authoritative)',
  })
  async recalculate(
    @CurrentUser() user: RequestPrincipal | undefined,
    @Param('cartId') cartId: string,
    @Headers('x-guest-token') guestToken: string | undefined,
    @Body() body: RecalculateCartDto,
  ) {
    const owner = this.resolveOwner(user, guestToken);
    this.applyGuestRls(owner);
    const result = await this.carts.recalculate({
      cartId,
      owner,
      ...(body.couponCode !== undefined ? { couponCode: body.couponCode } : {}),
      ...(body.refreshSnapshots !== undefined ? { refreshSnapshots: body.refreshSnapshots } : {}),
    });
    return {
      cart: this.cartResponse(result.cart),
      quotesByStore: result.quotesByStore,
      displaySubtotalMinor: result.displaySubtotalMinor,
      displayDiscountMinor: result.displayDiscountMinor,
      displayTotalMinor: result.displayTotalMinor,
    };
  }

  private resolveOwner(
    user: RequestPrincipal | undefined,
    guestToken: string | undefined,
  ): CartOwner {
    if (user?.userId) {
      return {
        customerId: user.userId,
        actorRoles: user.roles,
        ...(guestToken ? { guestToken } : {}),
      };
    }
    if (guestToken && guestToken.trim().length >= 8) {
      return { guestToken: guestToken.trim() };
    }
    throw new CartAccessDeniedError();
  }

  private applyGuestRls(owner: CartOwner): void {
    if (owner.guestToken) {
      setGuestToken(owner.guestToken);
    }
  }

  private cartResponse(cart: Cart) {
    return {
      id: cart.id.value,
      customerId: cart.customerId,
      guestToken: cart.guestToken,
      currencyCode: cart.currencyCode,
      status: cart.status,
      version: cart.version,
      lines: cart.lineSnapshots(),
      updatedAt: cart.updatedAt.toISOString(),
    };
  }
}
