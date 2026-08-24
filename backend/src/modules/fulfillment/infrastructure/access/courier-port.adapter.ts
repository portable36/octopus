import { Injectable } from '@nestjs/common';
import type {
  CourierPort,
  CreateCourierConsignmentInput,
  CreateCourierConsignmentResult,
  GetCourierConsignmentStatusInput,
  GetCourierConsignmentStatusResult,
} from '../../../../shared-kernel/application/ports/courier.port';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { CourierProviderError } from '../../application/errors/fulfillment.errors';
import { PathaoCourierClient } from '../integrations/pathao.client';
import { SteadfastCourierClient } from '../integrations/steadfast.client';

@Injectable()
export class CourierPortAdapter implements CourierPort {
  constructor(
    private readonly steadfast: SteadfastCourierClient,
    private readonly pathao: PathaoCourierClient,
  ) {}

  public async createConsignment(
    input: CreateCourierConsignmentInput,
  ): Promise<CreateCourierConsignmentResult> {
    if (input.provider === 'MANUAL') {
      const id = UniqueID.create().value;
      return {
        providerConsignmentId: id,
        trackingCode: null,
        providerStatus: 'pending',
      };
    }
    if (input.provider === 'STEADFAST') {
      return this.steadfast.createConsignment(input);
    }
    if (input.provider === 'PATHAO') {
      return this.pathao.createConsignment(input);
    }
    throw new CourierProviderError(
      `Unsupported provider ${input.provider}`,
      'UNSUPPORTED_PROVIDER',
    );
  }

  public async getConsignmentStatus(
    input: GetCourierConsignmentStatusInput,
  ): Promise<GetCourierConsignmentStatusResult> {
    if (input.provider === 'MANUAL') {
      return {
        providerStatus: 'pending',
        normalizedStatus: 'PENDING',
        rawStatus: 'pending',
      };
    }
    if (input.provider === 'STEADFAST') {
      return this.steadfast.getStatus(input);
    }
    if (input.provider === 'PATHAO') {
      return this.pathao.getStatus(input);
    }
    throw new CourierProviderError(
      `Unsupported provider ${input.provider}`,
      'UNSUPPORTED_PROVIDER',
    );
  }
}
