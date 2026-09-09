export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export interface PresignedPutUpload {
  readonly storageKey: string;
  readonly uploadUrl: string;
  readonly expiresAt: Date;
  readonly requiredHeaders: Readonly<Record<string, string>>;
}

export interface PresignedGetDownload {
  readonly storageKey: string;
  readonly downloadUrl: string;
  readonly expiresAt: Date;
}

export interface ObjectHeadResult {
  readonly storageKey: string;
  readonly contentLength: number;
  readonly contentType: string | null;
}

export interface ObjectStoragePort {
  createPresignedPut(input: {
    readonly storageKey: string;
    readonly contentType: string;
    readonly byteSize: number;
    readonly expiresInSeconds: number;
  }): Promise<PresignedPutUpload>;

  createPresignedGet(input: {
    readonly storageKey: string;
    readonly expiresInSeconds: number;
  }): Promise<PresignedGetDownload>;

  /** Returns null when the object is missing. */
  headObject(storageKey: string): Promise<ObjectHeadResult | null>;
}
