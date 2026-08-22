import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'platform_schema_lock' })
export class PlatformSchemaLockEntity {
  @PrimaryKey()
  id!: number;

  @Property({ columnType: 'timestamptz' })
  initializedAt: Date = new Date();
}
