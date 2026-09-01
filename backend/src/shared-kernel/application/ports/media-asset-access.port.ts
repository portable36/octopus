export const MEDIA_ASSET_ACCESS = Symbol('MEDIA_ASSET_ACCESS');

export interface MediaAssetSnapshot {
  readonly id: string;
  readonly contentType: string;
  readonly vendorId: string | null;
  readonly storeId: string | null;
}

export interface MediaPublicUrlSnapshot {
  readonly id: string;
  readonly contentType: string;
  readonly url: string;
}

export interface MediaAssetAccessPort {
  findById(mediaId: string): Promise<MediaAssetSnapshot | null>;
  resolvePublicImageUrl(mediaId: string): Promise<MediaPublicUrlSnapshot | null>;
}
