import { describe, expect, it, vi } from 'vitest';
import { SlowQueryLogger } from './slow-query-logger';

describe('SlowQueryLogger', () => {
  it('writes when duration meets threshold even if query debug is off', () => {
    const writer = vi.fn();
    const logger = new SlowQueryLogger(50, { writer, debugMode: false });

    logger.logQuery({ query: 'select 1', took: 80 });

    expect(writer).toHaveBeenCalledTimes(1);
    expect(String(writer.mock.calls[0]?.[0])).toContain('[slow-query]');
    expect(String(writer.mock.calls[0]?.[0])).toContain('took=80ms');
  });

  it('skips when below threshold and debug is off', () => {
    const writer = vi.fn();
    const logger = new SlowQueryLogger(50, { writer, debugMode: false });

    logger.logQuery({ query: 'select 1', took: 10 });

    expect(writer).not.toHaveBeenCalled();
  });

  it('disables slow detection when slowMs is 0', () => {
    const writer = vi.fn();
    const logger = new SlowQueryLogger(0, { writer, debugMode: false });

    logger.logQuery({ query: 'select 1', took: 5_000 });

    expect(writer).not.toHaveBeenCalled();
  });
});
