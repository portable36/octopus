import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  CodAlreadyCollectedError,
  CodCancelledError,
  CodNotCollectibleError,
  InvalidPaymentMethodError,
  InvalidPaymentMoneyError,
} from '../errors/payment.errors';
import type { PaymentIntentStatus, PaymentMethod, PaymentProvider } from '../payment.types';

interface PaymentIntentProps {
  readonly checkoutId: string;
  readonly orderId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly customerId: string | null;
  readonly paymentMethod: PaymentMethod;
  readonly provider: PaymentProvider;
  readonly status: PaymentIntentStatus;
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly clientSecret: string | null;
  readonly expiresAt: Date | null;
  readonly providerTransactionId?: string | null;
  readonly gatewayReferenceId?: string | null;
  readonly capturedAt?: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class PaymentIntent extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: PaymentIntentProps,
  ) {
    super(id);
  }

  public static create(input: {
    readonly checkoutId: string;
    readonly orderId: string;
    readonly vendorId: string;
    readonly storeId: string;
    readonly customerId: string | null;
    readonly paymentMethod: PaymentMethod;
    readonly amountMinor: number;
    readonly currencyCode: string;
    readonly expiresAt?: Date | null;
  }): PaymentIntent {
    if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) {
      throw new InvalidPaymentMoneyError('Amount must be a non-negative integer.');
    }
    const currency = input.currencyCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new InvalidPaymentMoneyError('Currency must be a 3-letter ISO code.');
    }

    const now = new Date();
    if (input.paymentMethod === 'COD') {
      const intent = new PaymentIntent(UniqueID.create(), {
        checkoutId: input.checkoutId,
        orderId: input.orderId,
        vendorId: input.vendorId,
        storeId: input.storeId,
        customerId: input.customerId,
        paymentMethod: 'COD',
        provider: 'COD',
        status: 'AWAITING_COLLECTION',
        amountMinor: input.amountMinor,
        currencyCode: currency,
        clientSecret: null,
        expiresAt: input.expiresAt ?? null,
        createdAt: now,
        updatedAt: now,
      });
      intent.addEvent('CodPaymentCreated', {
        paymentIntentId: intent.id.value,
        orderId: intent.orderId,
        storeId: intent.storeId,
        vendorId: intent.vendorId,
        amountMinor: intent.amountMinor,
        currencyCode: intent.currencyCode,
      });
      return intent;
    }

    if (
      input.paymentMethod !== 'SSLCOMMERZ' &&
      input.paymentMethod !== 'BKASH' &&
      input.paymentMethod !== 'NAGAD'
    ) {
      throw new InvalidPaymentMethodError();
    }

    const id = UniqueID.create();
    return new PaymentIntent(id, {
      checkoutId: input.checkoutId,
      orderId: input.orderId,
      vendorId: input.vendorId,
      storeId: input.storeId,
      customerId: input.customerId,
      paymentMethod: input.paymentMethod,
      provider: input.paymentMethod,
      status: 'REQUIRES_PAYMENT',
      amountMinor: input.amountMinor,
      currencyCode: currency,
      clientSecret: `pi_secret_${id.value.replace(/-/g, '').slice(0, 24)}`,
      expiresAt: input.expiresAt ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static reconstitute(id: UniqueID, props: PaymentIntentProps): PaymentIntent {
    return new PaymentIntent(id, props);
  }

  get checkoutId(): string {
    return this.props.checkoutId;
  }
  get orderId(): string {
    return this.props.orderId;
  }
  get vendorId(): string {
    return this.props.vendorId;
  }
  get storeId(): string {
    return this.props.storeId;
  }
  get customerId(): string | null {
    return this.props.customerId;
  }
  get paymentMethod(): PaymentMethod {
    return this.props.paymentMethod;
  }
  get provider(): PaymentProvider {
    return this.props.provider;
  }
  get status(): PaymentIntentStatus {
    return this.props.status;
  }
  get amountMinor(): number {
    return this.props.amountMinor;
  }
  get currencyCode(): string {
    return this.props.currencyCode;
  }
  get clientSecret(): string | null {
    return this.props.clientSecret;
  }
  get providerTransactionId(): string | null {
    return this.props.providerTransactionId ?? null;
  }
  get gatewayReferenceId(): string | null {
    return this.props.gatewayReferenceId ?? null;
  }
  get capturedAt(): Date | null {
    return this.props.capturedAt ?? null;
  }
  get expiresAt(): Date | null {
    return this.props.expiresAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public markCaptured(providerTransactionId: string, gatewayReferenceId?: string | null): void {
    if (this.props.paymentMethod === 'COD') {
      throw new InvalidPaymentMethodError(
        'COD intents cannot be marked captured; use markCollected.',
      );
    }
    if (this.props.status === 'CAPTURED') {
      return;
    }
    if (this.props.status !== 'REQUIRES_PAYMENT') {
      throw new Error(`Cannot capture payment intent with status ${this.props.status}.`);
    }
    const now = new Date();
    this.props = {
      ...this.props,
      status: 'CAPTURED',
      providerTransactionId,
      gatewayReferenceId: gatewayReferenceId ?? this.props.gatewayReferenceId ?? null,
      capturedAt: now,
      updatedAt: now,
    };
    this.addEvent('PaymentCaptured', {
      paymentIntentId: this.id.value,
      orderId: this.orderId,
      vendorId: this.vendorId,
      storeId: this.storeId,
      paymentMethod: this.paymentMethod,
      provider: this.provider,
      amountMinor: this.amountMinor,
      currencyCode: this.currencyCode,
      providerTransactionId,
      capturedAt: now.toISOString(),
    });
  }

  public markFailed(reason?: string): void {
    if (this.props.status === 'CAPTURED' || this.props.status === 'COLLECTED') {
      throw new Error(`Cannot fail an already collected or captured payment intent.`);
    }
    const now = new Date();
    this.props = {
      ...this.props,
      status: 'FAILED',
      updatedAt: now,
    };
    this.addEvent('PaymentFailed', {
      paymentIntentId: this.id.value,
      orderId: this.orderId,
      reason: reason ?? null,
    });
  }

  public cancelGateway(): void {
    if (this.props.status === 'CAPTURED' || this.props.status === 'COLLECTED') {
      throw new Error(`Cannot cancel an already collected or captured payment intent.`);
    }
    if (this.props.status === 'CANCELLED') {
      return;
    }
    const now = new Date();
    this.props = {
      ...this.props,
      status: 'CANCELLED',
      updatedAt: now,
    };
    this.addEvent('PaymentCancelled', {
      paymentIntentId: this.id.value,
      orderId: this.orderId,
    });
  }

  public assertCollectible(): void {
    if (this.props.paymentMethod !== 'COD') {
      throw new CodNotCollectibleError('Payment method is not COD.');
    }
    if (this.props.status === 'COLLECTED') {
      throw new CodAlreadyCollectedError();
    }
    if (this.props.status === 'CANCELLED') {
      throw new CodCancelledError();
    }
    if (this.props.status === 'EXPIRED' || this.props.status === 'FAILED') {
      throw new CodNotCollectibleError(`COD payment status is ${this.props.status}.`);
    }
    if (this.props.status !== 'AWAITING_COLLECTION') {
      throw new CodNotCollectibleError();
    }
    if (this.props.expiresAt && this.props.expiresAt.getTime() < Date.now()) {
      throw new CodNotCollectibleError('COD payment intent has expired.');
    }
  }

  public markCollected(): void {
    this.assertCollectible();
    this.props = {
      ...this.props,
      status: 'COLLECTED',
      updatedAt: new Date(),
    };
    this.addEvent('CodCollected', {
      paymentIntentId: this.id.value,
      orderId: this.orderId,
      vendorId: this.vendorId,
      storeId: this.storeId,
      amountMinor: this.amountMinor,
      currencyCode: this.currencyCode,
    });
  }

  public cancel(): void {
    if (this.props.paymentMethod !== 'COD') {
      throw new CodNotCollectibleError('Only COD intents can be cancelled via COD cancel.');
    }
    if (this.props.status === 'COLLECTED') {
      throw new CodAlreadyCollectedError();
    }
    if (this.props.status === 'CANCELLED') {
      return;
    }
    this.props = {
      ...this.props,
      status: 'CANCELLED',
      updatedAt: new Date(),
    };
    this.addEvent('CodCancelled', {
      paymentIntentId: this.id.value,
      orderId: this.orderId,
    });
  }
}
