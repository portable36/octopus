import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { UserOrmEntity } from './user.orm-entity';

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))('UserOrmEntity MikroORM integration', () => {
  it('persists and loads a user via EntityManager', async () => {
    const id = randomUUID();
    const email = `orm-it-${id}@example.com`;

    const orm = await MikroORM.init({
      clientUrl: databaseUrl as string,
      driver: PostgreSqlDriver,
      entities: [UserOrmEntity],
      discovery: { disableDynamicFileAccess: true, warnWhenNoEntities: false },
      allowGlobalContext: true,
    });

    try {
      const em = orm.em.fork();
      await em.transactional(async (tem) => {
        const now = new Date();
        const user = tem.create(UserOrmEntity, {
          id,
          email,
          name: 'ORM Integration',
          passwordHash: 'not-a-real-hash',
          status: 'active',
          roles: ['CUSTOMER'],
          failedLoginAttempts: 0,
          lockedUntil: null,
          mfaEnabled: false,
          mfaSecretCipher: null,
          createdAt: now,
          updatedAt: now,
        });
        await tem.persist(user).flush();
      });

      const loaded = await em.fork().findOne(UserOrmEntity, { id });
      expect(loaded).not.toBeNull();
      expect(loaded!.email).toBe(email);
      expect(loaded!.roles).toEqual(['CUSTOMER']);
      expect(loaded!.mfaEnabled).toBe(false);
    } finally {
      await orm.em.fork().nativeDelete(UserOrmEntity, { id });
      await orm.close(true);
    }
  });
});
