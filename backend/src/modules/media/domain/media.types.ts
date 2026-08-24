export type MediaAssetRecord = {
  readonly id: string;
  readonly originalFilename: string;
  readonly contentType: string;
  readonly byteSize: number;
  readonly storageKey: string;
  readonly uploadedBy: string;
  readonly vendorId: string | null;
  readonly storeId: string | null;
  readonly createdAt: Date;
};
