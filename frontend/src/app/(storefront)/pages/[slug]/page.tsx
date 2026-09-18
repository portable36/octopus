import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiClientError } from '@/lib/api-client';
import type { ContentBlock } from '@/lib/admin-content-api';
import { fetchPublishedContentPage } from '@/lib/content-public-api';
import { getPublicMediaUrl } from '@/lib/media-public';
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

async function renderBlock(block: ContentBlock, index: number) {
  if (block.type === 'heading') {
    const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3';
    return (
      <Tag key={index} className="font-semibold tracking-tight">
        {block.text}
      </Tag>
    );
  }
  if (block.type === 'paragraph') {
    return (
      <p key={index} className="leading-relaxed text-muted-foreground">
        {block.text}
      </p>
    );
  }
  if (block.type === 'markdown') {
    return (
      <pre
        key={index}
        className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm leading-relaxed"
      >
        {block.markdown}
      </pre>
    );
  }
  const media = await getPublicMediaUrl(block.mediaId);
  if (!media) {
    return null;
  }
  return (
    <img
      key={index}
      src={media.url}
      alt={block.alt ?? ''}
      className="max-h-[28rem] w-full object-contain"
    />
  );
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

  const blocks = await Promise.all(page.body.map((block, index) => renderBlock(block, index)));

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
      <div className="space-y-4">{blocks}</div>
    </article>
  );
}
