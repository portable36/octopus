import { describe, expect, it } from 'vitest';
import { SettingsAccessDeniedError } from '../errors/settings.errors';
import { SettingsAuthorizationService } from './settings-authorization.service';

describe('SettingsAuthorizationService', () => {
  const service = new SettingsAuthorizationService();

  it('denies vendor owner writing platform settings', () => {
    expect(() =>
      service.assertCanWrite(['VENDOR_OWNER'], { kind: 'platform' }, 'vendor-1', []),
    ).toThrow(SettingsAccessDeniedError);
  });

  it('denies store manager writing another store branding scope (IDOR harness)', () => {
    expect(() =>
      service.assertCanWrite(
        ['STORE_MANAGER'],
        {
          kind: 'store',
          vendorId: 'vendor-1',
          storeId: 'store-other',
        },
        'vendor-1',
        ['store-mine'],
      ),
    ).toThrow(SettingsAccessDeniedError);
  });

  it('allows store manager writing own store settings', () => {
    expect(() =>
      service.assertCanWrite(
        ['STORE_MANAGER'],
        {
          kind: 'store',
          vendorId: 'vendor-1',
          storeId: 'store-mine',
        },
        'vendor-1',
        ['store-mine'],
      ),
    ).not.toThrow();
  });
});
