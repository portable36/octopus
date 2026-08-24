import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'pos_receipt_sequences' })
@Unique({ properties: ['storeId', 'dayKey'] })
export class ReceiptSequenceOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  /** UTC yyyyMMdd */
  @Property({ fieldName: 'day_key' })
  dayKey!: string;

  @Property()
  nextValue!: number;
}
