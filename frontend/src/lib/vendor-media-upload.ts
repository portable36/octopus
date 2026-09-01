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

export type PublicMediaUrl = {
  id: string;
  contentType: string;
  url: string;
};

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const MAX_BYTES = 10 * 1024 * 1024;

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

export async function uploadVendorImage(
  vendorId: string,
  file: File,
): Promise<RegisteredMediaAsset> {
  const contentType = file.type.trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error('Only JPEG, PNG, WebP, and GIF images are supported.');
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error('Image must be between 1 byte and 10 MB.');
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

export async function getPublicMediaUrl(mediaId: string): Promise<PublicMediaUrl | null> {
  const { apiRequest } = await import('@/lib/api-client');
  try {
    return await apiRequest<PublicMediaUrl>(`/public/media/${encodeURIComponent(mediaId)}`);
  } catch {
    return null;
  }
}
