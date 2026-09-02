import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'system_settings' })
export class SystemSetting {
  @PrimaryKey({ length: 128 })
  key!: string;

  @Property({ type: 'jsonb' })
  value!: unknown;

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
