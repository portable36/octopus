export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export interface PresignedPutUpload {
  readonly storageKey: string;
  readonly uploadUrl: string;
  readonly expiresAt: Date;
  readonly requiredHeaders: Readonly<Record<string, string>>;
}

export interface ObjectStoragePort {
  createPresignedPut(input: {
    readonly storageKey: string;
    readonly contentType: string;
    readonly byteSize: number;
    readonly expiresInSeconds: number;
  }): Promise<PresignedPutUpload>;
}
