export class SettingsDomainError extends Error {
  readonly code: string;

  constructor(message: string, code = 'SETTINGS_DOMAIN_ERROR') {
    super(message);
    this.name = 'SettingsDomainError';
    this.code = code;
  }
}

export class SettingsAccessDeniedError extends Error {
  readonly code = 'SETTINGS_ACCESS_DENIED';

  constructor(message = 'Not authorized to manage settings for this scope.') {
    super(message);
    this.name = 'SettingsAccessDeniedError';
  }
}

export class SettingsNotFoundError extends Error {
  readonly code = 'SETTINGS_NOT_FOUND';

  constructor(message = 'Configuration document was not found.') {
    super(message);
    this.name = 'SettingsNotFoundError';
  }
}
