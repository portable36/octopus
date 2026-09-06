import type { PaymentMethod } from '../../domain/payment.types';
import type { PaymentGatewayPort } from '../../domain/ports/payment-gateway.port';

export const PAYMENT_GATEWAY_REGISTRY = Symbol('PAYMENT_GATEWAY_REGISTRY');

export interface PaymentGatewayRegistryPort {
  get(method: PaymentMethod): PaymentGatewayPort | undefined;
  has(method: PaymentMethod): boolean;
}
