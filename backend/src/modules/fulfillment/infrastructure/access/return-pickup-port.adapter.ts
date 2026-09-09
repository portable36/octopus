import { Injectable } from '@nestjs/common';
import type {
  ReturnPickupPort,
  ScheduleReturnPickupInput,
  ScheduleReturnPickupResult,
} from '../../../../shared-kernel/application/ports/return-pickup.port';
import { CreateReturnPickupHandler } from '../../application/commands/create-return-pickup.handler';

@Injectable()
export class ReturnPickupPortAdapter implements ReturnPickupPort {
  constructor(private readonly handler: CreateReturnPickupHandler) {}

  public schedulePickup(input: ScheduleReturnPickupInput): Promise<ScheduleReturnPickupResult> {
    return this.handler.execute(input);
  }
}
