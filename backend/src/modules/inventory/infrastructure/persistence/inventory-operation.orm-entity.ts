import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'inventory_operations' })
@Unique({ properties: ['idempotencyKey'] })
export class InventoryOperationOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'idempotency_key' })
  idempotencyKey!: string;

  @Property({ fieldName: 'operation_type' })
  operationType!: string;

  @Property({ fieldName: 'reference_id', nullable: true })
  referenceId: string | null = null;

  @Property({ fieldName: 'result_json', type: 'json', nullable: true })
  resultJson: Record<string, unknown> | null = null;

  @Property()
  status!: 'COMPLETED' | 'FAILED';

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;
}
