import { Inject, Injectable } from '@nestjs/common';
import type {
  CancelPaymentIntentInput,
  CodIntentLookupResult,
  ConfirmCodCollectionInput,
  ConfirmCodCollectionResult,
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  CreateRefundInput,
  CreateRefundResult,
  PaymentMethodDto,
  PaymentPort,
} from '../../../../shared-kernel/application/ports/payment.port';
import { GlobalConfigService } from '../../../configuration/application/services/global-config.service';
import {
  GLOBAL_CONFIG_GROUPS,
  GLOBAL_CONFIG_KEYS,
} from '../../../configuration/domain/global-config-keys';
import {
  CancelCodPaymentHandler,
  CollectCodPaymentHandler,
  CreatePaymentIntentHandler,
  CreateRefundHandler,
} from '../../application/commands/payment.handlers';
import {
  PAYMENT_REPOSITORY,
  type PaymentRepository,
} from '../../application/ports/payment-repository.interface';

@Injectable()
export class PaymentPortAdapter implements PaymentPort {
  constructor(
    @Inject(CreatePaymentIntentHandler)
    private readonly createHandler: CreatePaymentIntentHandler,
    @Inject(CollectCodPaymentHandler)
    private readonly collectHandler: CollectCodPaymentHandler,
    @Inject(CancelCodPaymentHandler)
    private readonly cancelHandler: CancelCodPaymentHandler,
    @Inject(CreateRefundHandler)
    private readonly refundHandler: CreateRefundHandler,
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(GlobalConfigService) private readonly globalConfig: GlobalConfigService,
  ) {}

  public async isPaymentMethodAvailable(paymentMethod: PaymentMethodDto): Promise<boolean> {
    switch (paymentMethod) {
      case 'COD':
        return this.globalConfig.get<boolean>(
          GLOBAL_CONFIG_GROUPS.PAYMENTS,
          GLOBAL_CONFIG_KEYS.payments.COD_ENABLED,
          true,
        );
      case 'SSLCOMMERZ':
        return this.globalConfig.get<boolean>(
          GLOBAL_CONFIG_GROUPS.PAYMENTS,
          GLOBAL_CONFIG_KEYS.payments.STRIPE_ENABLED,
          false,
        );
      case 'BKASH':
      case 'NAGAD':
        return this.globalConfig.get<boolean>(
          GLOBAL_CONFIG_GROUPS.PAYMENTS,
          GLOBAL_CONFIG_KEYS.payments.ADYEN_ENABLED,
          false,
        );
      default:
        return false;
    }
  }

  public createIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    return this.createHandler.execute(input);
  }

  public confirmCodCollection(
    input: ConfirmCodCollectionInput,
  ): Promise<ConfirmCodCollectionResult> {
    return this.collectHandler.execute(input);
  }

  public confirmCodCollectionFromFulfillment(
    input: Omit<ConfirmCodCollectionInput, 'actorRoles'> & {
      readonly actorRoles?: readonly string[];
    },
  ): Promise<ConfirmCodCollectionResult> {
    return this.collectHandler.executeTrusted(input);
  }

  public cancelIntent(input: CancelPaymentIntentInput): Promise<void> {
    return this.cancelHandler.execute(input);
  }

  public createRefund(input: CreateRefundInput): Promise<CreateRefundResult> {
    return this.refundHandler.execute(input);
  }

  public async findCodIntentByOrderId(orderId: string): Promise<CodIntentLookupResult | null> {
    const intent = await this.payments.findIntentByOrderId(orderId);
    if (!intent || intent.paymentMethod !== 'COD') {
      return null;
    }
    return {
      paymentIntentId: intent.id.value,
      orderId: intent.orderId,
      amountMinor: intent.amountMinor,
      currencyCode: intent.currencyCode,
      status: intent.status,
      paymentMethod: 'COD',
    };
  }
}
