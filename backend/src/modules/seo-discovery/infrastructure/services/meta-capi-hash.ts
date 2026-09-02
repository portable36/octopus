import { createHash } from 'node:crypto';

/** Meta CAPI: lowercase, trim, SHA-256 hex digest of normalized email. */
export function normalizeEmailForMeta(email: string): string {
  return email.trim().toLowerCase();
}

/** Meta CAPI: digits only (strip symbols/spaces). */
export function normalizePhoneForMeta(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function hashMetaPii(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function hashMetaEmail(email: string): string {
  const normalized = normalizeEmailForMeta(email);
  return normalized.length > 0 ? hashMetaPii(normalized) : '';
}

export function hashMetaPhone(phone: string): string {
  const normalized = normalizePhoneForMeta(phone);
  return normalized.length > 0 ? hashMetaPii(normalized) : '';
}
