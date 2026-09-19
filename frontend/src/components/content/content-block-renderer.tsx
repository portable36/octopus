import Link from 'next/link';
import type { ContentBlock, ContentLeafBlock } from '@/lib/admin-content-api';
import { getPublicMediaUrl } from '@/lib/media-public';
import { fetchPublicProduct, formatMoney, isNotFound } from '@/lib/storefront-api';
import { cn } from '@/lib/cn';

type Props = {
  readonly body: readonly ContentBlock[];
  readonly className?: string;
};

const GRID_COLS: Record<1 | 2 | 3, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
};

function ButtonBlock({ label, href }: { readonly label: string; readonly href: string }) {
  const className =
    'inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90';
  if (href.startsWith('https://')) {
    return (
      <a href={href} className={className} rel="noopener noreferrer">
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

async function LeafBlock({ block }: { readonly block: ContentLeafBlock }) {
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3';
      const size =
        block.level === 1 ? 'text-3xl md:text-4xl' : block.level === 2 ? 'text-2xl' : 'text-xl';
      return <Tag className={cn('font-semibold tracking-tight', size)}>{block.text}</Tag>;
    }
    case 'paragraph':
      return <p className="leading-relaxed text-muted-foreground">{block.text}</p>;
    case 'markdown':
      return (
        <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
          {block.markdown}
        </pre>
      );
    case 'image': {
      const media = await getPublicMediaUrl(block.mediaId);
      if (!media) return null;
      return (
        <img
          src={media.url}
          alt={block.alt ?? ''}
          className="max-h-[28rem] w-full object-contain"
        />
      );
    }
    case 'button':
      return (
        <div>
          <ButtonBlock label={block.label} href={block.href} />
        </div>
      );
    case 'product': {
      try {
        const product = await fetchPublicProduct(block.productId);
        const primary =
          product.media.find((m) => m.isPrimary && m.url) ?? product.media.find((m) => m.url);
        const offer = product.offers.find((o) => o.isAvailable) ?? product.offers[0];
        return (
          <Link
            href={`/products/${product.id}`}
            className="flex gap-3 rounded-md border border-border bg-card p-3 hover:bg-muted/40"
          >
            {primary?.url ? (
              <img
                src={primary.url}
                alt=""
                className="h-16 w-16 shrink-0 rounded object-cover bg-muted"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-muted text-sm font-semibold text-muted-foreground">
                {product.name.trim().charAt(0).toUpperCase() || 'P'}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{product.name}</p>
              {offer ? (
                <p className="text-sm tabular-nums text-muted-foreground">
                  {formatMoney(offer.priceMinor, offer.currencyCode)}
                </p>
              ) : null}
            </div>
          </Link>
        );
      } catch (error) {
        if (isNotFound(error)) return null;
        return null;
      }
    }
    case 'offer':
      // No public offer-by-id fetch yet — link placeholder.
      return (
        <p className="text-sm text-muted-foreground">
          Offer{' '}
          <Link href="/search" className="font-mono text-xs underline underline-offset-2">
            {block.offerId}
          </Link>
        </p>
      );
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

function LeafColumn({
  leaves,
  columnIndex,
}: {
  readonly leaves: readonly ContentLeafBlock[];
  readonly columnIndex: number;
}) {
  return (
    <div className="space-y-3">
      {leaves.map((leaf, i) => (
        <LeafBlock key={`${columnIndex}-${leaf.type}-${i}`} block={leaf} />
      ))}
    </div>
  );
}

export async function ContentBlockRenderer({ body, className }: Props) {
  return (
    <div className={cn('space-y-4', className)}>
      {body.map((block, index) => {
        if (block.type === 'section') {
          return (
            <div key={`section-${index}`} className={cn('grid gap-4', GRID_COLS[block.columns])}>
              {block.children.map((col, colIndex) => (
                <LeafColumn key={colIndex} leaves={col} columnIndex={colIndex} />
              ))}
            </div>
          );
        }
        return <LeafBlock key={`leaf-${index}`} block={block} />;
      })}
    </div>
  );
}
