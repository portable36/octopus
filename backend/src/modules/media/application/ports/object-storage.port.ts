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

export interface MultipartUploadInit {
  readonly storageKey: string;
  readonly uploadId: string;
}

export interface PresignedUploadPart {
  readonly uploadUrl: string;
  readonly expiresAt: Date;
  readonly partNumber: number;
  readonly requiredHeaders: Readonly<Record<string, string>>;
}

export interface UploadedPart {
  readonly partNumber: number;
  readonly etag: string;
  readonly size: number;
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

  /**
   * Reads the first `maxBytes` of an object (Range GET) for magic-byte validation.
   * Returns null when the object is missing.
   */
  readObjectPrefix(storageKey: string, maxBytes: number): Promise<Buffer | null>;

  createMultipartUpload(input: {
    readonly storageKey: string;
    readonly contentType: string;
  }): Promise<MultipartUploadInit>;

  createPresignedUploadPart(input: {
    readonly storageKey: string;
    readonly uploadId: string;
    readonly partNumber: number;
    readonly expiresInSeconds: number;
  }): Promise<PresignedUploadPart>;

  listUploadedParts(input: {
    readonly storageKey: string;
    readonly uploadId: string;
  }): Promise<readonly UploadedPart[]>;

  completeMultipartUpload(input: {
    readonly storageKey: string;
    readonly uploadId: string;
    readonly parts: readonly { readonly partNumber: number; readonly etag: string }[];
  }): Promise<void>;

  abortMultipartUpload(input: {
    readonly storageKey: string;
    readonly uploadId: string;
  }): Promise<void>;
}
