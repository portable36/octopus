import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'customer_addresses' })
export class CustomerAddressOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'user_id', type: 'uuid' })
  userId!: string;

  @Property()
  label!: string;

  @Property({ fieldName: 'recipient_name' })
  recipientName!: string;

  @Property({ nullable: true })
  phone: string | null = null;

  @Property()
  line1!: string;

  @Property({ nullable: true })
  line2: string | null = null;

  @Property()
  city!: string;

  @Property({ nullable: true })
  region: string | null = null;

  @Property({ fieldName: 'postal_code', nullable: true })
  postalCode: string | null = null;

  @Property({ fieldName: 'country_code' })
  countryCode!: string;

  @Property({ fieldName: 'is_default', default: false })
  isDefault!: boolean;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
