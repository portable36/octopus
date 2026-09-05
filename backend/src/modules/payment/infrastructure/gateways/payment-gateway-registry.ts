import { Injectable, Optional } from '@nestjs/common';
import type { PaymentMethod } from '../../domain/payment.types';
import type { PaymentGatewayPort } from '../../domain/ports/payment-gateway.port';
import { SslCommerzGatewayAdapter } from './sslcommerz-gateway.adapter';
import { BkashGatewayAdapter } from './bkash-gateway.adapter';
import { NagadGatewayAdapter } from './nagad-gateway.adapter';

@Injectable()
export class PaymentGatewayRegistry {
  private readonly adapters = new Map<PaymentMethod, PaymentGatewayPort>();

  constructor(
    @Optional() sslCommerz?: SslCommerzGatewayAdapter,
    @Optional() bkash?: BkashGatewayAdapter,
    @Optional() nagad?: NagadGatewayAdapter,
  ) {
    if (sslCommerz) this.adapters.set('SSLCOMMERZ', sslCommerz);
    if (bkash) this.adapters.set('BKASH', bkash);
    if (nagad) this.adapters.set('NAGAD', nagad);
  }

  public get(method: PaymentMethod): PaymentGatewayPort | undefined {
    return this.adapters.get(method);
  }

  public has(method: PaymentMethod): boolean {
    return this.adapters.has(method);
  }
}
