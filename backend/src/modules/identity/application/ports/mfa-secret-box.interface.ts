export const MFA_SECRET_BOX = Symbol('MFA_SECRET_BOX');

export interface MfaSecretBox {
  seal(plaintext: string): string;
  open(ciphertext: string): string;
}
