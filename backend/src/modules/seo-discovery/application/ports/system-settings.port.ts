export const SYSTEM_SETTINGS_PORT = Symbol('SYSTEM_SETTINGS_PORT');

export interface SystemSettingsPort {
  getSetting<T>(key: string): Promise<T | null>;
  updateSettings(
    settings: Record<string, unknown>,
  ): Promise<{ readonly updated: readonly string[] }>;
  listAllSettings(): Promise<Record<string, unknown>>;
  evictCacheKeys(keys: readonly string[]): Promise<void>;
}
