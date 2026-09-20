/**
 * Simulated/mock gateway paths are for local and test only.
 * Production must use live or sandbox provider APIs with real credentials.
 */
export function assertPaymentSimulationAllowed(
  isProduction: boolean,
  provider: string,
): void {
  if (!isProduction) {
    return;
  }
  throw new Error(
    `${provider} simulated payment path is forbidden in production. ` +
      'Set PAYMENT_GATEWAY_MODE=live|sandbox and configure provider credentials.',
  );
}
