import { describe, expect, it, vi } from 'vitest';
import { CourierPortAdapter } from './courier-port.adapter';
import { CourierProviderError } from '../../application/errors/fulfillment.errors';

describe('CourierPortAdapter quote', () => {
  it('routes Pathao quotes and rejects Steadfast', async () => {
    const pathao = {
      quoteDelivery: vi.fn().mockResolvedValue({
        provider: 'PATHAO',
        currencyCode: 'BDT',
        priceMinor: 8000,
        discountMinor: 0,
        finalPriceMinor: 8000,
      }),
      listCities: vi.fn().mockResolvedValue([{ id: 1, name: 'Dhaka' }]),
      listZones: vi.fn().mockResolvedValue([{ id: 10, name: 'Gulshan' }]),
    };
    const adapter = new CourierPortAdapter({} as never, pathao as never);

    const quote = await adapter.quoteDelivery({
      vendorId: 'v1',
      provider: 'PATHAO',
      weightKg: 0.5,
      recipientCityId: 1,
      recipientZoneId: 10,
    });
    expect(quote.finalPriceMinor).toBe(8000);
    expect(pathao.quoteDelivery).toHaveBeenCalled();

    await expect(
      adapter.quoteDelivery({
        vendorId: 'v1',
        provider: 'STEADFAST',
        weightKg: 0.5,
        recipientCityId: 1,
        recipientZoneId: 10,
      }),
    ).rejects.toBeInstanceOf(CourierProviderError);

    await expect(adapter.listQuoteCities({ vendorId: 'v1', provider: 'PATHAO' })).resolves.toEqual([
      { id: 1, name: 'Dhaka' },
    ]);
  });
});
