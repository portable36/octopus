export const LOGIN_RATE_LIMITER = Symbol('LOGIN_RATE_LIMITER');

export interface LoginRateLimiter {
  assertAllowed(key: string): Promise<void>;
  recordFailure(key: string): Promise<void>;
}
