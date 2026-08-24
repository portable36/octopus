import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import type { StoreStaffRole } from '../../domain/store.types';
import { StoreOrmEntity } from './store.orm-entity';

@Entity({ tableName: 'store_staff' })
export class StoreStaffOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => StoreOrmEntity)
  store!: StoreOrmEntity;

  @Property({ fieldName: 'user_id', type: 'uuid' })
  userId!: string;

  @Property()
  role!: StoreStaffRole;

  @Property({ fieldName: 'added_at' })
  addedAt!: Date;
}
