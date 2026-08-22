import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  readonly tenantId?: string;
  readonly userId?: string;
  readonly requestId: string;
}

const asyncLocalStorage = new AsyncLocalStorage<TenantContext>();

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

export function getCurrentTenantId(): string {
  const tenantId = getTenantContext().tenantId;
  if (!tenantId) {
    throw new Error('Authenticated tenant context is not available.');
  }
  return tenantId;
}

export function tryGetTenantContext(): TenantContext | undefined {
  return asyncLocalStorage.getStore();
}
