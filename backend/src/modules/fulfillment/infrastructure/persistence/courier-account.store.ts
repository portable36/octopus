import { EntityManager } from '@mikro-orm/core';
import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { CourierProvider } from '../../domain/fulfillment.types';
import { decryptSecret, encryptSecret } from '../crypto/credential-crypto';
import {
  CourierAccountOrmEntity,
  CourierOauthTokenOrmEntity,
} from '../persistence/fulfillment.orm-entity';

export interface SteadfastCredentials {
  readonly apiKey: string;
  readonly secretKey: string;
  readonly baseUrl?: string;
}

export interface PathaoCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly username: string;
  readonly password: string;
  readonly baseUrl?: string;
  readonly pathaoStoreId: number;
}

@Injectable()
export class CourierAccountStore {
  constructor(
    @Inject(EntityManager) private readonly em: EntityManager,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  private keyMaterial(): string {
    return this.config.courierCredentialsKey;
  }

  public async getSteadfast(vendorId: string): Promise<SteadfastCredentials | null> {
    const account = await this.findAccount(vendorId, 'STEADFAST');
    if (!account) {
      return this.config.steadfastSandboxCredentials;
    }
    return JSON.parse(
      decryptSecret(account.credentialsCipher, this.keyMaterial()),
    ) as SteadfastCredentials;
  }

  public async getPathao(vendorId: string): Promise<PathaoCredentials | null> {
    const account = await this.findAccount(vendorId, 'PATHAO');
    if (!account) {
      const sandbox = this.config.pathaoSandboxCredentials;
      if (!sandbox) {
        return null;
      }
      return sandbox;
    }
    const parsed = JSON.parse(
      decryptSecret(account.credentialsCipher, this.keyMaterial()),
    ) as PathaoCredentials;
    return {
      ...parsed,
      pathaoStoreId: account.pathaoStoreId ?? parsed.pathaoStoreId,
    };
  }

  public async upsertAccount(input: {
    readonly vendorId: string;
    readonly provider: CourierProvider;
    readonly credentials: Record<string, unknown>;
    readonly pathaoStoreId?: number | null;
  }): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      let entity = await tx.findOne(CourierAccountOrmEntity, {
        vendorId: input.vendorId,
        provider: input.provider,
      });
      if (!entity) {
        entity = new CourierAccountOrmEntity();
        entity.id = UniqueID.create().value;
        entity.vendorId = input.vendorId;
        entity.provider = input.provider;
        entity.createdAt = new Date();
        entity.isActive = true;
      }
      entity.credentialsCipher = encryptSecret(
        JSON.stringify(input.credentials),
        this.keyMaterial(),
      );
      entity.pathaoStoreId = input.pathaoStoreId ?? entity.pathaoStoreId ?? null;
      entity.updatedAt = new Date();
      await tx.persist(entity).flush();
    });
  }

  public async getOauthTokens(
    vendorId: string,
    provider: CourierProvider,
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date } | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(CourierOauthTokenOrmEntity, { vendorId, provider });
      if (!entity) {
        return null;
      }
      return {
        accessToken: decryptSecret(entity.accessTokenCipher, this.keyMaterial()),
        refreshToken: decryptSecret(entity.refreshTokenCipher, this.keyMaterial()),
        expiresAt: entity.expiresAt,
      };
    });
  }

  public async saveOauthTokens(input: {
    readonly vendorId: string;
    readonly provider: CourierProvider;
    readonly accessToken: string;
    readonly refreshToken: string;
    readonly expiresAt: Date;
  }): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      let entity = await tx.findOne(CourierOauthTokenOrmEntity, {
        vendorId: input.vendorId,
        provider: input.provider,
      });
      if (!entity) {
        entity = new CourierOauthTokenOrmEntity();
        entity.id = UniqueID.create().value;
        entity.vendorId = input.vendorId;
        entity.provider = input.provider;
      }
      entity.accessTokenCipher = encryptSecret(input.accessToken, this.keyMaterial());
      entity.refreshTokenCipher = encryptSecret(input.refreshToken, this.keyMaterial());
      entity.expiresAt = input.expiresAt;
      entity.updatedAt = new Date();
      await tx.persist(entity).flush();
    });
  }

  private async findAccount(
    vendorId: string,
    provider: CourierProvider,
  ): Promise<CourierAccountOrmEntity | null> {
    return withRlsContext(this.em, async (tx) => {
      return tx.findOne(CourierAccountOrmEntity, { vendorId, provider, isActive: true });
    });
  }
}
