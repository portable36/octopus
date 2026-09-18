import { authedRequest } from '@/lib/auth-api';
import { getPublicMediaUrl } from '@/lib/media-public';

export type AdminMediaUploadLimits = {
  allowedContentTypes: string[];
  maxBytes: number;
  multipartMaxBytes: number;
};

export type AdminMediaAsset = {
  id: string;
  originalFilename: string;
  contentType: string;
  byteSize: number;
  storageKey: string;
  uploadedBy: string;
  vendorId: string | null;
  storeId: string | null;
  status: string;
  rejectionReason: string | null;
  processedAt: string | null;
  createdAt: string;
  downloadUrl?: string;
  downloadUrlExpiresAt?: string | null;
};

export type AdminMediaListResult = {
  items: AdminMediaAsset[];
  nextCursor: string | null;
};

export type AdminMediaUploadSession = {
  storageKey: string;
  uploadUrl: string;
  expiresAt: string;
  requiredHeaders: Readonly<Record<string, string>>;
  originalFilename: string;
  contentType: string;
  byteSize: number;
};

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

export function fetchAdminMediaLimits(): Promise<AdminMediaUploadLimits> {
  return authedRequest<AdminMediaUploadLimits>('/admin/media/limits');
}

export function listAdminMedia(
  input: {
    limit?: number;
    cursor?: string | null;
    status?: string | null;
    contentType?: string | null;
    q?: string | null;
    scope?: 'platform' | 'all';
    includeArchived?: boolean;
  } = {},
): Promise<AdminMediaListResult> {
  const params = new URLSearchParams();
  if (input.limit) params.set('limit', String(input.limit));
  if (input.cursor) params.set('cursor', input.cursor);
  if (input.status) params.set('status', input.status);
  if (input.contentType) params.set('contentType', input.contentType);
  if (input.q) params.set('q', input.q);
  if (input.scope) params.set('scope', input.scope);
  if (input.includeArchived) params.set('includeArchived', '1');
  const qs = params.toString();
  return authedRequest<AdminMediaListResult>(`/admin/media${qs ? `?${qs}` : ''}`);
}

export function getAdminMedia(mediaId: string): Promise<AdminMediaAsset> {
  return authedRequest<AdminMediaAsset>(`/admin/media/${encodeURIComponent(mediaId)}`);
}

export function archiveAdminMedia(mediaId: string): Promise<AdminMediaAsset> {
  return authedRequest<AdminMediaAsset>(`/admin/media/${encodeURIComponent(mediaId)}/archive`, {
    method: 'POST',
  });
}

export function createAdminMediaUploadSession(input: {
  originalFilename: string;
  contentType: string;
  byteSize: number;
}): Promise<AdminMediaUploadSession> {
  return authedRequest<AdminMediaUploadSession>('/admin/media/upload-sessions', {
    method: 'POST',
    body: input,
  });
}

export function registerAdminMedia(input: {
  originalFilename: string;
  contentType: string;
  byteSize: number;
  storageKey: string;
  contentPrefixBase64: string;
}): Promise<AdminMediaAsset> {
  return authedRequest<AdminMediaAsset>('/admin/media', {
    method: 'POST',
    body: input,
  });
}

export async function uploadAdminPlatformImage(
  file: File,
  limits?: AdminMediaUploadLimits | null,
): Promise<AdminMediaAsset> {
  const contentType = file.type.trim().toLowerCase() || 'application/octet-stream';
  const allowed = new Set(
    limits?.allowedContentTypes ?? [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/x-icon',
      'image/vnd.microsoft.icon',
    ],
  );
  if (!allowed.has(contentType)) {
    throw new Error(`File type not allowed (${contentType || 'unknown'}).`);
  }
  const maxBytes = limits?.maxBytes ?? 10 * 1024 * 1024;
  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error(`File must be between 1 byte and ${Math.round(maxBytes / (1024 * 1024))} MB.`);
  }

  const contentPrefixBase64 = await readFilePrefixBase64(file);
  const session = await createAdminMediaUploadSession({
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

  return registerAdminMedia({
    originalFilename: file.name,
    contentType: session.contentType,
    byteSize: file.size,
    storageKey: session.storageKey,
    contentPrefixBase64,
  });
}

export async function resolveAdminMediaPreviewUrl(asset: AdminMediaAsset): Promise<string | null> {
  if (asset.downloadUrl) {
    return asset.downloadUrl;
  }
  const publicUrl = await getPublicMediaUrl(asset.id);
  return publicUrl?.url ?? null;
}
