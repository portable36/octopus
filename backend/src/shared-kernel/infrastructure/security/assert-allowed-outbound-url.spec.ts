import { describe, expect, it } from 'vitest';
import {
  OutboundUrlNotAllowedError,
  assertAllowedOutboundUrl,
  resolveAllowedBaseUrl,
} from './assert-allowed-outbound-url';

describe('assertAllowedOutboundUrl', () => {
  const allow = ['courier-api-sandbox.pathao.com', 'portal.packzy.com'];

  it('accepts allowlisted https hosts', () => {
    const url = assertAllowedOutboundUrl('https://courier-api-sandbox.pathao.com/api', allow);
    expect(url.hostname).toBe('courier-api-sandbox.pathao.com');
  });

  it('accepts subdomains of allowlisted hosts', () => {
    const url = assertAllowedOutboundUrl('https://api.portal.packzy.com/v1', allow);
    expect(url.hostname).toBe('api.portal.packzy.com');
  });

  it('rejects non-allowlisted hosts', () => {
    expect(() => assertAllowedOutboundUrl('https://evil.example/x', allow)).toThrow(
      OutboundUrlNotAllowedError,
    );
  });

  it('rejects http when https required', () => {
    expect(() => assertAllowedOutboundUrl('http://portal.packzy.com/api', allow)).toThrow(
      OutboundUrlNotAllowedError,
    );
  });

  it('rejects private/metadata hosts even if listed', () => {
    expect(() =>
      assertAllowedOutboundUrl('https://169.254.169.254/latest', ['169.254.169.254']),
    ).toThrow(OutboundUrlNotAllowedError);
  });

  it('rejects userinfo', () => {
    expect(() =>
      assertAllowedOutboundUrl('https://user:pass@portal.packzy.com/api', allow),
    ).toThrow(OutboundUrlNotAllowedError);
  });

  it('resolveAllowedBaseUrl strips trailing slash', () => {
    expect(resolveAllowedBaseUrl(undefined, 'https://portal.packzy.com/api/v1/', allow)).toBe(
      'https://portal.packzy.com/api/v1',
    );
  });
});
