import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'media_assets' })
export class MediaAssetOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'original_filename' })
  originalFilename!: string;

  @Property({ fieldName: 'content_type' })
  contentType!: string;

  @Property({ fieldName: 'byte_size', type: 'integer' })
  byteSize!: number;

  @Property({ fieldName: 'storage_key' })
  storageKey!: string;

  @Property({ fieldName: 'uploaded_by', type: 'uuid' })
  uploadedBy!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid', nullable: true })
  vendorId: string | null = null;

  @Property({ fieldName: 'store_id', type: 'uuid', nullable: true })
  storeId: string | null = null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;
}
