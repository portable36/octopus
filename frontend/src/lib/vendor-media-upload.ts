import { authedRequest } from '@/lib/auth-api';

export type MediaUploadSession = {
  storageKey: string;
  uploadUrl: string;
  expiresAt: string;
  requiredHeaders: Readonly<Record<string, string>>;
  originalFilename: string;
  contentType: string;
  byteSize: number;
};

export type MultipartUploadSession = {
  storageKey: string;
  uploadId: string;
  expiresAt: string;
  partSizeHintBytes: number;
  originalFilename: string;
  contentType: string;
  byteSize: number;
};

export type MultipartPartUrl = {
  storageKey: string;
  uploadId: string;
  partNumber: number;
  uploadUrl: string;
  expiresAt: string;
  requiredHeaders: Readonly<Record<string, string>>;
};

export type RegisteredMediaAsset = {
  id: string;
  originalFilename: string;
  contentType: string;
  byteSize: number;
  storageKey: string;
  uploadedBy: string;
  vendorId: string | null;
  storeId: string | null;
  createdAt: string;
};

export type { PublicMediaUrl } from '@/lib/media-public';
export { getPublicMediaUrl } from '@/lib/media-public';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const MAX_SINGLE_PUT_BYTES = 10 * 1024 * 1024;
const MAX_MULTIPART_BYTES = 100 * 1024 * 1024;

function readFilePrefixBase64(file: File, length = 12): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result;
      if (!(buffer instanceof ArrayBuffer)) {
        reject(new Error('Failed to read file prefix.'));
        return;
      }
      const bytes = new Uint8Array(buffer).subarray(0, length);
      let binary = '';
      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }
      resolve(btoa(binary));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file.slice(0, length));
  });
}

export function createVendorMediaUploadSession(
  vendorId: string,
  input: { originalFilename: string; contentType: string; byteSize: number },
): Promise<MediaUploadSession> {
  return authedRequest<MediaUploadSession>(
    `/vendors/${encodeURIComponent(vendorId)}/media/upload-sessions`,
    { method: 'POST', body: input },
  );
}

export function createVendorMultipartSession(
  vendorId: string,
  input: { originalFilename: string; contentType: string; byteSize: number },
): Promise<MultipartUploadSession> {
  return authedRequest<MultipartUploadSession>(
    `/vendors/${encodeURIComponent(vendorId)}/media/multipart-sessions`,
    { method: 'POST', body: input },
  );
}

export function createVendorMultipartPartUrl(
  vendorId: string,
  input: { storageKey: string; uploadId: string; partNumber: number },
): Promise<MultipartPartUrl> {
  return authedRequest<MultipartPartUrl>(
    `/vendors/${encodeURIComponent(vendorId)}/media/multipart-sessions/part-urls`,
    { method: 'POST', body: input },
  );
}

export function listVendorMultipartParts(
  vendorId: string,
  input: { storageKey: string; uploadId: string },
): Promise<{
  storageKey: string;
  uploadId: string;
  parts: { partNumber: number; etag: string; size: number }[];
}> {
  const qs = new URLSearchParams({
    storageKey: input.storageKey,
    uploadId: input.uploadId,
  });
  return authedRequest(
    `/vendors/${encodeURIComponent(vendorId)}/media/multipart-sessions/parts?${qs.toString()}`,
  );
}

export function completeVendorMultipartSession(
  vendorId: string,
  input: {
    storageKey: string;
    uploadId: string;
    parts: { partNumber: number; etag: string }[];
  },
): Promise<{ storageKey: string; uploadId: string; completed: true }> {
  return authedRequest(
    `/vendors/${encodeURIComponent(vendorId)}/media/multipart-sessions/complete`,
    { method: 'POST', body: input },
  );
}

export function abortVendorMultipartSession(
  vendorId: string,
  input: { storageKey: string; uploadId: string },
): Promise<{ storageKey: string; uploadId: string; aborted: true }> {
  return authedRequest(`/vendors/${encodeURIComponent(vendorId)}/media/multipart-sessions/abort`, {
    method: 'POST',
    body: input,
  });
}

export function registerVendorMedia(
  vendorId: string,
  input: {
    originalFilename: string;
    contentType: string;
    byteSize: number;
    storageKey: string;
    contentPrefixBase64: string;
  },
): Promise<RegisteredMediaAsset> {
  return authedRequest<RegisteredMediaAsset>(`/vendors/${encodeURIComponent(vendorId)}/media`, {
    method: 'POST',
    body: input,
  });
}

async function uploadViaMultipart(
  vendorId: string,
  file: File,
  contentType: string,
): Promise<RegisteredMediaAsset> {
  const contentPrefixBase64 = await readFilePrefixBase64(file);
  const session = await createVendorMultipartSession(vendorId, {
    originalFilename: file.name,
    contentType,
    byteSize: file.size,
  });

  const partSize = session.partSizeHintBytes;
  const parts: { partNumber: number; etag: string }[] = [];
  let offset = 0;
  let partNumber = 1;

  try {
    while (offset < file.size) {
      const end = Math.min(offset + partSize, file.size);
      const blob = file.slice(offset, end);
      const partUrl = await createVendorMultipartPartUrl(vendorId, {
        storageKey: session.storageKey,
        uploadId: session.uploadId,
        partNumber,
      });
      const uploadResponse = await fetch(partUrl.uploadUrl, {
        method: 'PUT',
        headers: partUrl.requiredHeaders,
        body: blob,
      });
      if (!uploadResponse.ok) {
        throw new Error(`Upload part ${partNumber} failed. Check MinIO CORS and try again.`);
      }
      const etag = uploadResponse.headers.get('ETag') ?? uploadResponse.headers.get('etag');
      if (!etag) {
        throw new Error(`Upload part ${partNumber} did not return an ETag.`);
      }
      parts.push({ partNumber, etag });
      offset = end;
      partNumber += 1;
    }

    await completeVendorMultipartSession(vendorId, {
      storageKey: session.storageKey,
      uploadId: session.uploadId,
      parts,
    });
  } catch (error) {
    try {
      await abortVendorMultipartSession(vendorId, {
        storageKey: session.storageKey,
        uploadId: session.uploadId,
      });
    } catch {
      // Best-effort abort; surface the original failure.
    }
    throw error;
  }

  return registerVendorMedia(vendorId, {
    originalFilename: file.name,
    contentType,
    byteSize: file.size,
    storageKey: session.storageKey,
    contentPrefixBase64,
  });
}

export async function uploadVendorImage(
  vendorId: string,
  file: File,
): Promise<RegisteredMediaAsset> {
  const contentType = file.type.trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error('Only JPEG, PNG, WebP, and GIF images are supported.');
  }
  if (file.size <= 0 || file.size > MAX_MULTIPART_BYTES) {
    throw new Error('Image must be between 1 byte and 100 MB.');
  }

  if (file.size > MAX_SINGLE_PUT_BYTES) {
    return uploadViaMultipart(vendorId, file, contentType);
  }

  const contentPrefixBase64 = await readFilePrefixBase64(file);
  const session = await createVendorMediaUploadSession(vendorId, {
    originalFilename: file.name,
    contentType,
    byteSize: file.size,
  });

  const uploadResponse = await fetch(session.uploadUrl, {
    method: 'PUT',
    headers: session.requiredHeaders,
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error('Upload to storage failed. Check MinIO CORS and try again.');
  }

  return registerVendorMedia(vendorId, {
    originalFilename: file.name,
    contentType,
    byteSize: file.size,
    storageKey: session.storageKey,
    contentPrefixBase64,
  });
}
