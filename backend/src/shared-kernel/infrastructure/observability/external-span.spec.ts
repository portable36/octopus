import { describe, expect, it } from 'vitest';
import { withExternalSpan } from './external-span';

describe('withExternalSpan', () => {
  it('returns the callback result when SDK is off', async () => {
    const value = await withExternalSpan('test.op', { 'octopus.test': true }, async () => 42);
    expect(value).toBe(42);
  });

  it('rethrows after recording failure', async () => {
    await expect(
      withExternalSpan('test.fail', {}, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });
});
