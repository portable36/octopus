import { describe, expect, it } from 'vitest';
import { mergePayload, WIZARD_STEPS } from './store-wizard-flow';

describe('store-wizard-flow', () => {
  it('has 17 wizard steps', () => {
    expect(WIZARD_STEPS).toHaveLength(17);
    expect(WIZARD_STEPS[0]?.step).toBe(1);
    expect(WIZARD_STEPS[16]?.step).toBe(17);
  });

  it('merges payload sections without dropping other sections', () => {
    const merged = mergePayload(
      { basic: { displayName: 'Test' }, payment: { codEnabled: true } },
      'basic',
      { storeCode: 'TST-001' },
    );
    expect(merged.basic?.displayName).toBe('Test');
    expect(merged.basic?.storeCode).toBe('TST-001');
    expect(merged.payment?.codEnabled).toBe(true);
  });
});
