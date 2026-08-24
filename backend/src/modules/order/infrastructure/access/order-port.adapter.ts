import { Inject, Injectable } from '@nestjs/common';
import type {
  CheckoutOrderCreateInput,
  CheckoutOrderCreateResult,
  OrderPort,
} from '../../../../shared-kernel/application/ports/order.port';
import { CreateOrderFromCheckoutHandler } from '../../application/commands/order.handlers';

@Injectable()
export class OrderPortAdapter implements OrderPort {
  constructor(
    @Inject(CreateOrderFromCheckoutHandler)
    private readonly createHandler: CreateOrderFromCheckoutHandler,
  ) {}

  public async createFromCheckout(
    input: CheckoutOrderCreateInput,
  ): Promise<CheckoutOrderCreateResult> {
    return this.createHandler.execute(input);
  }
}
