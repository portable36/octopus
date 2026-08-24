import { Body, Controller, Headers, HttpCode, Post, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { Public } from '../../../../shared-kernel/presentation/http/public.decorator';
import { setGuestToken } from '../../../../shared-kernel/infrastructure/context/tenant-context.storage';
import type { CartOwnerRef } from '../../../../shared-kernel/application/ports/cart.port';
import { CheckoutSubmitHandler } from '../../application/commands/checkout.handlers';
import { CheckoutAccessDeniedError } from '../../application/errors/checkout.errors';
import { SubmitCheckoutDto } from './dto/checkout.dto';
import { CheckoutExceptionFilter } from './filters/checkout-exception.filter';

@ApiTags('checkout')
@Controller('checkout')
@ApiBearerAuth()
@ApiHeader({ name: 'x-guest-token', required: false })
@ApiHeader({
  name: 'idempotency-key',
  required: false,
  description: 'Optional alias; body.idempotencyKey is required',
})
@UseFilters(CheckoutExceptionFilter)
export class CheckoutController {
  constructor(private readonly checkout: CheckoutSubmitHandler) {}

  @Public()
  @Post('submit')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Authoritative checkout: validate cart, price, reserve inventory, create orders + payment intent',
  })
  async submit(
    @CurrentUser() user: RequestPrincipal | undefined,
    @Headers('x-guest-token') guestToken: string | undefined,
    @Headers('idempotency-key') idempotencyHeader: string | undefined,
    @Body() body: SubmitCheckoutDto,
  ) {
    const owner = this.resolveOwner(user, guestToken);
    if (owner.guestToken) {
      setGuestToken(owner.guestToken);
    }
    const idempotencyKey = body.idempotencyKey || idempotencyHeader;
    if (!idempotencyKey || idempotencyKey.trim().length < 8) {
      throw new CheckoutAccessDeniedError();
    }

    return this.checkout.submit({
      owner,
      cartId: body.cartId,
      expectedCartVersion: body.expectedCartVersion,
      idempotencyKey: idempotencyKey.trim(),
      shippingAddress: {
        line1: body.shippingAddress.line1,
        city: body.shippingAddress.city,
        countryCode: body.shippingAddress.countryCode.toUpperCase(),
        ...(body.shippingAddress.line2 !== undefined ? { line2: body.shippingAddress.line2 } : {}),
        ...(body.shippingAddress.region !== undefined
          ? { region: body.shippingAddress.region }
          : {}),
        ...(body.shippingAddress.postalCode !== undefined
          ? { postalCode: body.shippingAddress.postalCode }
          : {}),
      },
      shippingMethod: body.shippingMethod,
      ...(body.shippingMinor !== undefined ? { shippingMinor: body.shippingMinor } : {}),
      ...(body.taxRateBps !== undefined ? { taxRateBps: body.taxRateBps } : {}),
      ...(body.commissionRateBps !== undefined
        ? { commissionRateBps: body.commissionRateBps }
        : {}),
      ...(body.couponCode !== undefined ? { couponCode: body.couponCode } : {}),
    });
  }

  private resolveOwner(
    user: RequestPrincipal | undefined,
    guestToken: string | undefined,
  ): CartOwnerRef {
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
    throw new CheckoutAccessDeniedError();
  }
}
