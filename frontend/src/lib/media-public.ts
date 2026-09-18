import { apiRequest } from '@/lib/api-client';

export type PublicMediaUrl = {
  id: string;
  contentType: string;
  url: string;
  expiresAt?: string | null;
};

/** Public CDN/signed URL for a media asset. Returns null when missing or not resolvable. */
export async function getPublicMediaUrl(mediaId: string): Promise<PublicMediaUrl | null> {
  const id = mediaId.trim();
  if (!id) {
    return null;
  }
  try {
    return await apiRequest<PublicMediaUrl>(`/public/media/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}
