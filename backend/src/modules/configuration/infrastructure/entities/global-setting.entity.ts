import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'global_settings' })
@Unique({ properties: ['group', 'key'] })
export class GlobalSetting {
  @PrimaryKey({ length: 64, fieldName: 'group' })
  group!: string;

  @PrimaryKey({ length: 128 })
  key!: string;

  @Property({ type: 'jsonb' })
  value!: unknown;

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
