import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { assertSslCommerzIpnSign, md5Hex, verifySslCommerzSign } from './sslcommerz-verify-sign';

function buildSignedPayload(
  storePasswd: string,
  fields: Record<string, string>,
): Record<string, string> {
  const verifyKey = Object.keys(fields).join(',');
  const values = { ...fields, store_passwd: md5Hex(storePasswd) };
  const sortedKeys = Object.keys(values).sort((a, b) => a.localeCompare(b));
  const hashString = sortedKeys.map((k) => `${k}=${values[k as keyof typeof values]}`).join('&');
  const verify_sign = createHash('md5').update(hashString, 'utf8').digest('hex');
  return { ...fields, verify_key: verifyKey, verify_sign };
}

describe('verifySslCommerzSign', () => {
  const storePasswd = 'testboxpasswd';

  it('accepts a correctly signed IPN payload', () => {
    const payload = buildSignedPayload(storePasswd, {
      amount: '100.00',
      status: 'VALID',
      tran_id: 'intent-1',
      val_id: 'val-1',
    });
    expect(verifySslCommerzSign({ payload, storePasswd })).toBe(true);
  });

  it('rejects tampered field values', () => {
    const payload = buildSignedPayload(storePasswd, {
      amount: '100.00',
      status: 'VALID',
      tran_id: 'intent-1',
    });
    payload.amount = '999.00';
    expect(verifySslCommerzSign({ payload, storePasswd })).toBe(false);
  });

  it('rejects wrong store password', () => {
    const payload = buildSignedPayload(storePasswd, {
      amount: '50',
      status: 'VALID',
    });
    expect(verifySslCommerzSign({ payload, storePasswd: 'other-pass' })).toBe(false);
  });

  it('rejects missing verify_sign or verify_key', () => {
    expect(
      verifySslCommerzSign({
        payload: { amount: '1', verify_key: 'amount' },
        storePasswd,
      }),
    ).toBe(false);
    expect(
      verifySslCommerzSign({
        payload: { amount: '1', verify_sign: 'abc' },
        storePasswd,
      }),
    ).toBe(false);
  });
});

describe('assertSslCommerzIpnSign', () => {
  it('no-ops when store password is unset', () => {
    expect(() =>
      assertSslCommerzIpnSign({
        payload: { amount: '1' },
        storePasswd: undefined,
      }),
    ).not.toThrow();
  });

  it('throws UnauthorizedException when configured and sign is invalid', () => {
    try {
      assertSslCommerzIpnSign({
        payload: { amount: '1', verify_key: 'amount', verify_sign: '00'.repeat(16) },
        storePasswd: 'secret',
      });
      expect.unreachable('expected throw');
    } catch (error) {
      expect(error).toMatchObject({
        response: expect.objectContaining({ code: 'SSLCOMMERZ_VERIFY_SIGN_INVALID' }),
      });
    }
  });
});
