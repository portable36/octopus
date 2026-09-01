import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import type { MfaSecretBox } from '../../application/ports/mfa-secret-box.interface';
import { decryptSecret, encryptSecret } from '../crypto/secret-box';

@Injectable()
export class JwtKeyMfaSecretBoxAdapter implements MfaSecretBox {
  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  public seal(plaintext: string): string {
    return encryptSecret(plaintext, this.config.jwtSecret);
  }

  public open(ciphertext: string): string {
    return decryptSecret(ciphertext, this.config.jwtSecret);
  }
}
