import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import type { ConfigurationKey, ConfigurationScopeKind } from '../../domain/settings.types';

@Entity({ tableName: 'configuration_documents' })
export class ConfigurationDocumentOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property()
  key!: ConfigurationKey;

  @Property({ fieldName: 'scope_kind' })
  scopeKind!: ConfigurationScopeKind;

  @Property({ fieldName: 'vendor_id', type: 'uuid', nullable: true })
  vendorId: string | null = null;

  @Property({ fieldName: 'store_id', type: 'uuid', nullable: true })
  storeId: string | null = null;

  @Property({ fieldName: 'schema_version', type: 'integer' })
  schemaVersion!: number;

  @Property({ type: 'json' })
  payload!: Record<string, unknown>;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;

  @Property({ fieldName: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null = null;
}
