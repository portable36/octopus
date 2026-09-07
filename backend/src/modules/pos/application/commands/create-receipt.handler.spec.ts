import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CreateReceiptHandler } from './create-receipt.handler';
import { ReceiptTemplate } from '../../domain/aggregates/receipt-template.aggregate';
import { Receipt } from '../../domain/aggregates/receipt.aggregate';
import { Register } from '../../domain/aggregates/register.aggregate';
import { ReceiptRepository } from '../ports/receipt-repository.interface';
import { ReceiptTemplateRepository } from '../ports/receipt-template-repository.interface';
import { RegisterRepository } from '../ports/register-repository.interface';
import { PosAuthorizationService } from '../services/pos-authorization.service';
import { ReceiptTemplateHandler } from './receipt-template.handler';

describe('CreateReceiptHandler & Offline Sync', () => {
  let receiptsRepo: ReceiptRepository;
  let templatesRepo: ReceiptTemplateRepository;
  let registersRepo: RegisterRepository;
  let authService: PosAuthorizationService;
  let templateHandler: ReceiptTemplateHandler;
  let handler: CreateReceiptHandler;

  const storeId = 'store-uuid-001';
  const vendorId = 'vendor-uuid-001';
  const actorUserId = 'staff-user-01';

  beforeEach(() => {
    const savedReceipts = new Map<string, Receipt>();
    let counter = 1;

    receiptsRepo = {
      save: vi.fn(async (r: Receipt) => {
        savedReceipts.set(`${r.storeId}:${r.saleId}`, r);
      }),
      findById: vi.fn(async (id: string) => {
        for (const r of savedReceipts.values()) {
          if (r.id.value === id) return r;
        }
        return null;
      }),
      findByStoreAndSaleId: vi.fn(async (sId: string, saleId: string) => {
        return savedReceipts.get(`${sId}:${saleId}`) ?? null;
      }),
      allocateReceiptNumber: vi.fn(async () => {
        return `POS-20260907-${String(counter++).padStart(4, '0')}`;
      }),
    };

    const template = ReceiptTemplate.createDefault({
      storeId,
      vendorId,
      displayName: 'Octopus Flagship',
      addressLines: ['Main Road, Dhaka'],
      locale: 'en-US',
      currencyCode: 'BDT',
      actorUserId,
    });

    templatesRepo = {
      findByStoreId: vi.fn(async () => template),
      findById: vi.fn(async () => template),
      save: vi.fn(async () => {}),
    } as unknown as ReceiptTemplateRepository;

    templateHandler = {
      getOrCreate: vi.fn(async () => template),
    } as unknown as ReceiptTemplateHandler;

    const activeReg = Register.create({
      storeId,
      vendorId,
      code: 'REG-01',
      name: 'Counter 1',
    });

    const inactiveReg = Register.create({
      storeId,
      vendorId,
      code: 'REG-INACTIVE',
      name: 'Old Counter',
    });
    inactiveReg.decommission();

    registersRepo = {
      findByStoreAndCode: vi.fn(async (_sId: string, code: string) => {
        if (code === 'REG-01') return activeReg;
        if (code === 'REG-INACTIVE') return inactiveReg;
        return null;
      }),
    } as unknown as RegisterRepository;

    authService = {
      requireReceiptViewer: vi.fn(async () => ({ storeId, vendorId } as any)),
    } as unknown as PosAuthorizationService;

    handler = new CreateReceiptHandler(
      receiptsRepo,
      templatesRepo as unknown as ReceiptTemplateRepository,
      registersRepo as unknown as RegisterRepository,
      authService as unknown as PosAuthorizationService,
      templateHandler as unknown as ReceiptTemplateHandler,
    );
  });

  it('creates an immutable receipt and generates ESC/POS payload', async () => {
    const receipt = await handler.fromSaleSnapshot({
      storeId,
      actorUserId,
      actorRoles: ['STORE_STAFF'],
      saleId: 'sale-001',
      soldAt: new Date('2026-09-07T10:00:00.000Z'),
      cashierName: 'Rahim',
      registerCode: 'REG-01',
      lines: [{ name: 'Item A', quantity: 1, lineTotalMinor: 50_000 }],
      subtotalMinor: 50_000,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: 50_000,
      payments: [{ method: 'CASH', amountPaidMinor: 50_000 }],
      changeMinor: 0,
      currencyCode: 'BDT',
    });

    expect(receipt.receiptNumber).toBe('POS-20260907-0001');
    expect(receipt.renderedText).toContain('Item A');

    const escpos = await handler.getEscPos(receipt.id.value, actorUserId, ['STORE_STAFF']);
    expect(escpos.base64.length).toBeGreaterThan(50);
    expect(escpos.hex.startsWith('1b40')).toBe(true);
  });

  it('syncs offline receipts batch idempotently', async () => {
    const items = [
      {
        clientTransactionId: 'offline-sale-01',
        soldAt: new Date('2026-09-07T11:00:00.000Z'),
        cashierName: 'Karim',
        registerCode: 'REG-01',
        lines: [{ name: 'Offline Item 1', quantity: 2, lineTotalMinor: 100_000 }],
        subtotalMinor: 100_000,
        discountMinor: 0,
        taxMinor: 0,
        totalMinor: 100_000,
        payments: [{ method: 'CASH', amountPaidMinor: 100_000 }],
        changeMinor: 0,
        currencyCode: 'BDT',
      },
      {
        clientTransactionId: 'offline-sale-02',
        soldAt: new Date('2026-09-07T11:05:00.000Z'),
        cashierName: 'Karim',
        registerCode: 'REG-INACTIVE', // Inactive register
        lines: [{ name: 'Offline Item 2', quantity: 1, lineTotalMinor: 20_000 }],
        subtotalMinor: 20_000,
        discountMinor: 0,
        taxMinor: 0,
        totalMinor: 20_000,
        payments: [{ method: 'CASH', amountPaidMinor: 20_000 }],
        changeMinor: 0,
        currencyCode: 'BDT',
      },
    ];

    // First sync attempt
    const result1 = await handler.syncOfflineReceipts({
      storeId,
      actorUserId,
      actorRoles: ['STORE_STAFF'],
      items,
    });

    expect(result1.totalProcessed).toBe(2);
    expect(result1.syncedCount).toBe(1);
    expect(result1.rejectedCount).toBe(1);

    expect(result1.results[0]!.status).toBe('SYNCED');
    expect(result1.results[0]!.receiptNumber).toBeDefined();

    expect(result1.results[1]!.status).toBe('REJECTED');
    expect(result1.results[1]!.error).toContain('DECOMMISSIONED');

    // Second sync attempt with the exact same items - proves idempotency
    const result2 = await handler.syncOfflineReceipts({
      storeId,
      actorUserId,
      actorRoles: ['STORE_STAFF'],
      items,
    });

    expect(result2.syncedCount).toBe(0);
    expect(result2.alreadySyncedCount).toBe(1);
    expect(result2.results[0]!.status).toBe('ALREADY_SYNCED');
  });
});
