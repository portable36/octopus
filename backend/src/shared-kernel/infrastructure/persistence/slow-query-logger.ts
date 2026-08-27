import { DefaultLogger, type LogContext, type LoggerOptions } from '@mikro-orm/core';

/**
 * Emits normal MikroORM debug query logs when enabled, and always warns on slow queries
 * when `slowMs > 0` (even with debug off in production).
 */
export class SlowQueryLogger extends DefaultLogger {
  constructor(
    private readonly slowMs: number,
    options: LoggerOptions,
  ) {
    super(options);
  }

  public override logQuery(context: { query: string } & LogContext): void {
    const took = context.took;
    const isSlow = this.slowMs > 0 && typeof took === 'number' && took >= this.slowMs;

    if (isSlow) {
      const sql = context.query.replace(/\s+/g, ' ').trim().slice(0, 500);
      this.writer(`[slow-query] took=${took}ms sql=${sql}`);
      return;
    }

    super.logQuery(context);
  }
}
