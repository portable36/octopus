export const API_RATE_LIMITER = Symbol('API_RATE_LIMITER');

export interface ApiRateLimiter {
  /**
   * Increment `key` and throw when the count exceeds `max` within `windowSeconds`.
   * Every call counts (unlike auth failure-only limiters).
   */
  consume(key: string, max: number, windowSeconds: number): Promise<void>;
}
