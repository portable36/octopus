import { Injectable } from '@nestjs/common';
import type {
  CourierPort,
  CourierQuoteCity,
  CourierQuoteZone,
  CreateCourierConsignmentInput,
  CreateCourierConsignmentResult,
  GetCourierConsignmentStatusInput,
  GetCourierConsignmentStatusResult,
  QuoteCourierDeliveryInput,
  QuoteCourierDeliveryResult,
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

  public async quoteDelivery(
    input: QuoteCourierDeliveryInput,
  ): Promise<QuoteCourierDeliveryResult> {
    if (input.provider === 'PATHAO') {
      return this.pathao.quoteDelivery(input);
    }
    throw new CourierProviderError(
      `${input.provider} does not support delivery fee quotes. Use Pathao price-plan.`,
      'QUOTE_UNSUPPORTED',
    );
  }

  public async listQuoteCities(input: {
    readonly vendorId: string;
    readonly provider: QuoteCourierDeliveryInput['provider'];
  }): Promise<readonly CourierQuoteCity[]> {
    if (input.provider === 'PATHAO') {
      return this.pathao.listCities(input.vendorId);
    }
    throw new CourierProviderError(
      `${input.provider} does not expose quote cities.`,
      'QUOTE_UNSUPPORTED',
    );
  }

  public async listQuoteZones(input: {
    readonly vendorId: string;
    readonly provider: QuoteCourierDeliveryInput['provider'];
    readonly cityId: number;
  }): Promise<readonly CourierQuoteZone[]> {
    if (input.provider === 'PATHAO') {
      return this.pathao.listZones(input.vendorId, input.cityId);
    }
    throw new CourierProviderError(
      `${input.provider} does not expose quote zones.`,
      'QUOTE_UNSUPPORTED',
    );
  }
}
