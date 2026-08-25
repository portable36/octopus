export const USER_CONTACT_PORT = Symbol('USER_CONTACT_PORT');

/** Minimal contact lookup for Notification (no Identity imports in consumers). */
export interface UserContactPort {
  findEmailByUserId(userId: string): Promise<string | null>;
}
