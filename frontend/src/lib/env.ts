const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1';

export function getPublicApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export function getPublicAppName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME ?? 'Octopus';
}
