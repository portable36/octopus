import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'customer_profiles' })
export class CustomerProfileOrmEntity {
  @PrimaryKey({ fieldName: 'user_id', type: 'uuid' })
  userId!: string;

  @Property({ fieldName: 'display_name' })
  displayName!: string;

  @Property({ nullable: true })
  phone: string | null = null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
