'use client';

import type { ContentBlock, ContentLeafBlock } from '@/lib/admin-content-api';
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

function PreviewLeaf({ block }: { readonly block: ContentLeafBlock }) {
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3';
      return (
        <Tag className="font-semibold tracking-tight">
          {block.text || <span className="text-muted-foreground">Heading</span>}
        </Tag>
      );
    }
    case 'paragraph':
      return (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {block.text || <span className="italic">Empty paragraph</span>}
        </p>
      );
    case 'markdown':
      return (
        <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-xs leading-relaxed">
          {block.markdown || 'Empty markdown'}
        </pre>
      );
    case 'image':
      return (
        <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
          Image{block.mediaId ? `: ${block.mediaId}` : ' (no media)'}
          {block.alt ? ` · ${block.alt}` : ''}
        </div>
      );
    case 'button':
      return (
        <span className="inline-flex rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          {block.label || 'Button'} → {block.href || '/'}
        </span>
      );
    case 'product':
      return (
        <div className="rounded-md border border-border px-3 py-2 text-xs">
          Product: <span className="font-mono">{block.productId || '—'}</span>
        </div>
      );
    case 'offer':
      return (
        <div className="rounded-md border border-border px-3 py-2 text-xs">
          Offer: <span className="font-mono">{block.offerId || '—'}</span>
        </div>
      );
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

/** Client draft preview — mirrors public renderer structure without network fetches. */
export function ContentBlockPreview({ body, className }: Props) {
  return (
    <div className={cn('space-y-3', className)}>
      {body.length === 0 ? (
        <p className="text-sm text-muted-foreground">No blocks yet.</p>
      ) : null}
      {body.map((block, index) => {
        if (block.type === 'section') {
          return (
            <div
              key={`section-${index}`}
              className={cn('grid gap-3 rounded-md border border-border/60 p-3', GRID_COLS[block.columns])}
            >
              {block.children.map((col, colIndex) => (
                <div key={colIndex} className="space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Col {colIndex + 1}
                  </p>
                  {col.map((leaf, leafIndex) => (
                    <PreviewLeaf key={`${colIndex}-${leafIndex}`} block={leaf} />
                  ))}
                </div>
              ))}
            </div>
          );
        }
        return <PreviewLeaf key={`leaf-${index}`} block={block} />;
      })}
    </div>
  );
}
