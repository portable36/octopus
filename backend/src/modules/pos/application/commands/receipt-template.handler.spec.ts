import { describe, expect, it, vi } from 'vitest';
import { ReceiptTemplateHandler } from './receipt-template.handler';
import { ReceiptTemplate } from '../../domain/aggregates/receipt-template.aggregate';
import { PosAccessDeniedError } from '../errors/pos.errors';

describe('ReceiptTemplateHandler authorization', () => {
  it('rejects template updates for non-managers', async () => {
    const auth = {
      requireTemplateManager: vi.fn().mockRejectedValue(new PosAccessDeniedError()),
      requireReceiptViewer: vi.fn(),
      requireStore: vi.fn(),
    };
    const templates = {
      save: vi.fn(),
      findByStoreId: vi.fn(),
      findById: vi.fn(),
    };
    const handler = new ReceiptTemplateHandler(templates as never, auth as never);

    await expect(
      handler.update('store-1', 'staff-1', ['STORE_STAFF'], { displayName: 'Hack' }),
    ).rejects.toBeInstanceOf(PosAccessDeniedError);
    expect(templates.save).not.toHaveBeenCalled();
  });

  it('allows managers to update thank-you copy', async () => {
    const storeId = '00000000-0000-7000-8000-000000000010';
    const vendorId = '00000000-0000-7000-8000-000000000020';
    const existing = ReceiptTemplate.createDefault({
      storeId,
      vendorId,
      displayName: 'Store Name',
    });
    const auth = {
      requireTemplateManager: vi.fn().mockResolvedValue({
        storeId,
        vendorId,
        displayName: 'Store Name',
        slug: 'store-name',
        description: null,
        locale: 'en-BD',
        currencyCode: 'BDT',
        acceptsOnlineOrders: true,
        addressLine1: null,
        city: null,
        region: null,
        managerUserIds: ['manager-1'],
        staffUserIds: ['manager-1'],
        status: 'active',
        codEnabled: false,
        codMinAmountMinor: 0,
        codMaxAmountMinor: null,
        codReservationTtlHours: 72,
      }),
      requireReceiptViewer: vi.fn().mockResolvedValue({
        storeId,
        vendorId,
        displayName: 'Store Name',
        slug: 'store-name',
        description: null,
        locale: 'en-BD',
        currencyCode: 'BDT',
        acceptsOnlineOrders: true,
        addressLine1: null,
        city: null,
        region: null,
        managerUserIds: ['manager-1'],
        staffUserIds: ['manager-1'],
        status: 'active',
        codEnabled: false,
        codMinAmountMinor: 0,
        codMaxAmountMinor: null,
        codReservationTtlHours: 72,
      }),
      requireStore: vi.fn(),
    };
    const templates = {
      save: vi.fn(),
      findByStoreId: vi.fn().mockResolvedValue(existing),
      findById: vi.fn(),
    };
    const handler = new ReceiptTemplateHandler(templates as never, auth as never);

    const updated = await handler.update(storeId, 'manager-1', ['STORE_MANAGER'], {
      thankYouText: 'Thanks for shopping with us.',
    });

    expect(updated.thankYouText).toBe('Thanks for shopping with us.');
    expect(templates.save).toHaveBeenCalledOnce();
  });
});
