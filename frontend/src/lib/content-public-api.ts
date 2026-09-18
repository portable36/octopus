import { apiRequest } from '@/lib/api-client';
import type { ContentBlock, ContentPageSeo } from '@/lib/admin-content-api';

export type PublicContentPage = {
  id: string;
  publicationId: string;
  title: string;
  slug: string;
  body: ContentBlock[];
  seo: ContentPageSeo;
  publishedAt: string;
};

export function fetchPublishedContentPage(slug: string): Promise<PublicContentPage> {
  return apiRequest<PublicContentPage>(`/storefront/content/pages/${encodeURIComponent(slug)}`);
}
