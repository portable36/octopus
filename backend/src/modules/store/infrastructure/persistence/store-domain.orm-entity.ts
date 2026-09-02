import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'store_domains' })
@Unique({ properties: ['hostname'] })
export class StoreDomainOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property()
  hostname!: string;

  @Property({ default: 'subdomain' })
  kind!: string;

  @Property({ fieldName: 'is_primary', default: false })
  isPrimary = false;

  @Property({ fieldName: 'verification_status', default: 'pending' })
  verificationStatus!: string;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;
}
