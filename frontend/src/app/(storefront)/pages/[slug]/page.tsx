import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StructuredData } from '@/components/seo/StructuredData';
import { fetchSeoPageContext, isSeoNotFound } from '@/lib/seo-discovery-api';
import { toNextMetadata } from '@/lib/seo-metadata-factory';

export const revalidate = 60;

type Props = {
  readonly params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const context = await fetchSeoPageContext(`/pages/${slug}`);
    return toNextMetadata(context);
  } catch {
    return { title: 'Page' };
  }
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;

  let context;
  try {
    context = await fetchSeoPageContext(`/pages/${slug}`);
  } catch (error) {
    if (isSeoNotFound(error)) {
      notFound();
    }
    throw error;
  }

  return (
    <article className="space-y-6">
      {context.structuredData.map((block, index) => (
        <StructuredData key={`seo-ld-${index}`} data={block} />
      ))}
      <header className="space-y-3">
        <p className="sf-breadcrumb">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span aria-hidden="true"> / </span>
          Page
        </p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          {context.metadata.title}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{context.metadata.description}</p>
      </header>
    </article>
  );
}
