import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContentBlockRenderer } from '@/components/content/content-block-renderer';
import { ApiClientError } from '@/lib/api-client';
import { fetchPublishedContentPage } from '@/lib/content-public-api';
import { absoluteUrl } from '@/lib/seo';

export const revalidate = 60;

type Props = {
  readonly params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const page = await fetchPublishedContentPage(slug);
    const title = page.seo.metaTitle?.trim() || page.title;
    const description = page.seo.metaDescription?.trim() || undefined;
    return {
      title,
      description,
      alternates: {
        canonical: absoluteUrl(page.seo.canonicalPath?.trim() || `/pages/${page.slug}`),
      },
    };
  } catch {
    return { title: 'Page' };
  }
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;

  let page;
  try {
    page = await fetchPublishedContentPage(slug);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <article className="space-y-6">
      <header className="space-y-3">
        <p className="sf-breadcrumb">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span aria-hidden="true"> / </span>
          {page.title}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{page.title}</h1>
      </header>
      <ContentBlockRenderer body={page.body} />
    </article>
  );
}
