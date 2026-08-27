import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuthenticatedPrincipal } from './authenticated-principal';

export interface TenantContext {
  readonly requestId: string;
  /** Correlation / incoming trace id; prefers OpenTelemetry span id when SDK is on. */
  readonly traceId?: string;
  readonly principal?: AuthenticatedPrincipal;
  readonly userId?: string;
  readonly tenantId?: string;
  readonly vendorId?: string;
  readonly storeId?: string;
  readonly platformScope?: boolean;
  /** Opaque guest cart token for anonymous carts (RLS app.guest_token). */
  readonly guestToken?: string;
}

type MutableTenantContext = {
  -readonly [K in keyof TenantContext]: TenantContext[K];
};

const asyncLocalStorage = new AsyncLocalStorage<TenantContext>();

export function createRequestContext(requestId: string, traceId?: string): TenantContext {
  return { requestId, traceId: traceId ?? requestId };
}

export function runWithTenantContext<T>(context: TenantContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

export function getTenantContext(): TenantContext {
  const context = asyncLocalStorage.getStore();
  if (!context) {
    throw new Error('Tenant context is not available outside of a request scope.');
  }
  return context;
}

export function tryGetTenantContext(): TenantContext | undefined {
  return asyncLocalStorage.getStore();
}

export function getCurrentTenantId(): string {
  const tenantId = getTenantContext().tenantId;
  if (!tenantId) {
    throw new Error('Authenticated tenant context is not available.');
  }
  return tenantId;
}

export function getCurrentVendorId(): string {
  const vendorId = getTenantContext().vendorId;
  if (!vendorId) {
    throw new Error('Vendor scope is not available for this request.');
  }
  return vendorId;
}

export function getCurrentStoreId(): string {
  const storeId = getTenantContext().storeId;
  if (!storeId) {
    throw new Error('Store scope is not available for this request.');
  }
  return storeId;
}

export function isPlatformScopeActive(): boolean {
  return getTenantContext().platformScope === true;
}

function mutateContext(): MutableTenantContext | undefined {
  return asyncLocalStorage.getStore() as MutableTenantContext | undefined;
}

export function setAuthenticatedPrincipal(principal: AuthenticatedPrincipal): void {
  const context = mutateContext();
  if (!context) {
    return;
  }

  context.principal = principal;
  context.userId = principal.userId;
}

/** @deprecated Use setAuthenticatedPrincipal */
export function setAuthenticatedUserId(userId: string): void {
  const context = mutateContext();
  if (!context) {
    return;
  }

  context.userId = userId;
}

export function setTenantScope(tenantId: string): void {
  const context = mutateContext();
  if (!context) {
    return;
  }

  context.tenantId = tenantId;
}

export function setVendorScope(vendorId: string, tenantId?: string): void {
  const context = mutateContext();
  if (!context) {
    return;
  }

  context.vendorId = vendorId;
  context.platformScope = false;
  if (tenantId) {
    context.tenantId = tenantId;
  }
}

export function setStoreScope(storeId: string): void {
  const context = mutateContext();
  if (!context) {
    return;
  }

  context.storeId = storeId;
  context.platformScope = false;
}

export function setPlatformScope(active: boolean): void {
  const context = mutateContext();
  if (!context) {
    return;
  }

  context.platformScope = active;
  if (active) {
    delete context.vendorId;
    delete context.storeId;
  }
}

export function setGuestToken(guestToken: string): void {
  const context = mutateContext();
  if (!context) {
    return;
  }
  context.guestToken = guestToken;
}

export function clearVendorStoreScope(): void {
  const context = mutateContext();
  if (!context) {
    return;
  }

  delete context.vendorId;
  delete context.storeId;
  context.platformScope = false;
}
