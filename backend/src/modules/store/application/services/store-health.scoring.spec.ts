import { describe, expect, it } from 'vitest';
import type { StoreHealthCheck, StoreHealthSeverity } from '../services/store-health.service';

/** Mirrors StoreHealthService score aggregation for regression without DB. */
function scoreFromChecks(checks: readonly StoreHealthCheck[]): StoreHealthSeverity {
  if (checks.some((c) => !c.ok && c.severity === 'CRITICAL')) {
    return 'CRITICAL';
  }
  if (checks.some((c) => !c.ok && c.severity === 'WARNING')) {
    return 'WARNING';
  }
  return 'OK';
}

describe('store health scoring', () => {
  it('returns CRITICAL when any failed check is critical', () => {
    expect(
      scoreFromChecks([
        {
          key: 'a',
          label: 'a',
          ok: false,
          severity: 'WARNING',
          detail: '',
        },
        {
          key: 'b',
          label: 'b',
          ok: false,
          severity: 'CRITICAL',
          detail: '',
        },
      ]),
    ).toBe('CRITICAL');
  });

  it('returns WARNING when only warnings fail', () => {
    expect(
      scoreFromChecks([
        {
          key: 'a',
          label: 'a',
          ok: true,
          severity: 'OK',
          detail: '',
        },
        {
          key: 'b',
          label: 'b',
          ok: false,
          severity: 'WARNING',
          detail: '',
        },
      ]),
    ).toBe('WARNING');
  });

  it('returns OK when all checks pass', () => {
    expect(
      scoreFromChecks([
        {
          key: 'a',
          label: 'a',
          ok: true,
          severity: 'OK',
          detail: '',
        },
      ]),
    ).toBe('OK');
  });
});
