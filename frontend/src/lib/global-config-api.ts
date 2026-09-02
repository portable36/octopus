import { apiRequest } from '@/lib/api-client';

export type GlobalConfigGrouped = Record<string, Record<string, unknown>>;

export type GlobalConfigResponse = {
  readonly settings: GlobalConfigGrouped;
};

export type GlobalConfigPatchResponse = {
  readonly updated: readonly string[];
};

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export function fetchGlobalConfig(token: string) {
  return apiRequest<GlobalConfigResponse>('/admin/config', {
    headers: authHeaders(token),
  });
}

export function patchGlobalConfig(token: string, settings: GlobalConfigGrouped) {
  return apiRequest<GlobalConfigPatchResponse>('/admin/config', {
    method: 'PATCH',
    headers: authHeaders(token),
    body: { settings },
  });
}
