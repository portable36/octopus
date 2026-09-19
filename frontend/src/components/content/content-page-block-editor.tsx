'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MediaLibraryPicker } from '@/components/admin/media-library-picker';
import { Button } from '@/components/ui/button';
import { fieldClass } from '@/components/ui/field';
import type {
  ContentBlock,
  ContentLeafBlock,
  ContentSectionBlock,
} from '@/lib/admin-content-api';

const HTTPS_OR_PATH = /^(https:\/\/[^\s]+|\/[A-Za-z0-9/_?&=#.\-~%]*)$/;

export function emptyParagraph(): ContentLeafBlock {
  return { type: 'paragraph', text: '' };
}

export function emptyHeading(): ContentLeafBlock {
  return { type: 'heading', level: 2, text: '' };
}

export function emptyMarkdown(): ContentLeafBlock {
  return { type: 'markdown', markdown: '' };
}

export function emptyImage(): ContentLeafBlock {
  return { type: 'image', mediaId: '', alt: '' };
}

export function emptyButton(): ContentLeafBlock {
  return { type: 'button', label: '', href: '/' };
}

export function emptyProduct(): ContentLeafBlock {
  return { type: 'product', productId: '' };
}

export function emptyOffer(): ContentLeafBlock {
  return { type: 'offer', offerId: '' };
}

export function emptySection(columns: 1 | 2 | 3 = 2): ContentSectionBlock {
  return {
    type: 'section',
    columns,
    children: Array.from({ length: columns }, () => [] as ContentLeafBlock[]),
  };
}

function blockId(block: ContentBlock, index: number): string {
  return `block-${index}-${block.type}`;
}

function resizeSectionColumns(
  section: ContentSectionBlock,
  columns: 1 | 2 | 3,
): ContentSectionBlock {
  const next = section.children.slice(0, columns).map((col) => [...col]);
  while (next.length < columns) {
    next.push([]);
  }
  return { ...section, columns, children: next };
}

type LeafEditorProps = {
  readonly leaf: ContentLeafBlock;
  readonly onChange: (next: ContentLeafBlock) => void;
  readonly onRemove: () => void;
  readonly onMoveUp?: () => void;
  readonly onMoveDown?: () => void;
};

function LeafEditor({ leaf, onChange, onRemove, onMoveUp, onMoveDown }: LeafEditorProps) {
  return (
    <div className="space-y-2 rounded border border-border/70 bg-background p-2">
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-xs font-medium capitalize text-muted-foreground">{leaf.type}</span>
        <span className="flex-1" />
        {onMoveUp ? (
          <Button type="button" variant="ghost" size="sm" onClick={onMoveUp}>
            ↑
          </Button>
        ) : null}
        {onMoveDown ? (
          <Button type="button" variant="ghost" size="sm" onClick={onMoveDown}>
            ↓
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>

      {leaf.type === 'heading' ? (
        <>
          <select
            className={fieldClass}
            value={leaf.level}
            onChange={(e) =>
              onChange({ ...leaf, level: Number(e.target.value) as 1 | 2 | 3 })
            }
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <input
            className={fieldClass}
            value={leaf.text}
            onChange={(e) => onChange({ ...leaf, text: e.target.value })}
            placeholder="Heading text"
          />
        </>
      ) : null}

      {leaf.type === 'paragraph' ? (
        <textarea
          className={fieldClass}
          rows={3}
          value={leaf.text}
          onChange={(e) => onChange({ ...leaf, text: e.target.value })}
          placeholder="Paragraph"
        />
      ) : null}

      {leaf.type === 'markdown' ? (
        <textarea
          className={fieldClass}
          rows={4}
          value={leaf.markdown}
          onChange={(e) => onChange({ ...leaf, markdown: e.target.value })}
          placeholder="Markdown (rendered as plain text, no HTML)"
        />
      ) : null}

      {leaf.type === 'image' ? (
        <div className="space-y-2">
          <MediaLibraryPicker
            label="image"
            value={leaf.mediaId || null}
            onChange={(mediaId) => onChange({ ...leaf, mediaId: mediaId ?? '' })}
          />
          <input
            className={fieldClass}
            value={leaf.alt ?? ''}
            onChange={(e) => onChange({ ...leaf, alt: e.target.value })}
            placeholder="Alt text"
          />
          {leaf.mediaId ? (
            <p className="font-mono text-[10px] text-muted-foreground">{leaf.mediaId}</p>
          ) : null}
        </div>
      ) : null}

      {leaf.type === 'button' ? (
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className={fieldClass}
            value={leaf.label}
            onChange={(e) => onChange({ ...leaf, label: e.target.value })}
            placeholder="Label"
          />
          <input
            className={fieldClass}
            value={leaf.href}
            onChange={(e) => onChange({ ...leaf, href: e.target.value })}
            placeholder="/path or https://…"
            pattern={HTTPS_OR_PATH.source}
            title="Must be a path starting with / or an https:// URL"
          />
        </div>
      ) : null}

      {leaf.type === 'product' ? (
        <input
          className={fieldClass}
          value={leaf.productId}
          onChange={(e) => onChange({ ...leaf, productId: e.target.value })}
          placeholder="Product UUID"
        />
      ) : null}

      {leaf.type === 'offer' ? (
        <input
          className={fieldClass}
          value={leaf.offerId}
          onChange={(e) => onChange({ ...leaf, offerId: e.target.value })}
          placeholder="Offer UUID"
        />
      ) : null}
    </div>
  );
}

type SortableTopBlockProps = {
  readonly id: string;
  readonly block: ContentBlock;
  readonly onChange: (next: ContentBlock) => void;
  readonly onRemove: () => void;
};

function SortableTopBlock({ id, block, onChange, onRemove }: SortableTopBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  function updateSection(next: ContentSectionBlock) {
    onChange(next);
  }

  function updateColumnLeaf(colIndex: number, leafIndex: number, leaf: ContentLeafBlock) {
    if (block.type !== 'section') return;
    const children = block.children.map((col, i) =>
      i === colIndex ? col.map((l, j) => (j === leafIndex ? leaf : l)) : [...col],
    );
    updateSection({ ...block, children });
  }

  function removeColumnLeaf(colIndex: number, leafIndex: number) {
    if (block.type !== 'section') return;
    const children = block.children.map((col, i) =>
      i === colIndex ? col.filter((_, j) => j !== leafIndex) : [...col],
    );
    updateSection({ ...block, children });
  }

  function moveColumnLeaf(colIndex: number, leafIndex: number, dir: -1 | 1) {
    if (block.type !== 'section') return;
    const source = block.children[colIndex];
    if (!source) return;
    const col = [...source];
    const target = leafIndex + dir;
    if (target < 0 || target >= col.length) return;
    const tmp = col[leafIndex]!;
    col[leafIndex] = col[target]!;
    col[target] = tmp;
    const children = block.children.map((c, i) => (i === colIndex ? col : [...c]));
    updateSection({ ...block, children });
  }

  function addColumnLeaf(colIndex: number, leaf: ContentLeafBlock) {
    if (block.type !== 'section') return;
    const children = block.children.map((col, i) =>
      i === colIndex ? [...col, leaf] : [...col],
    );
    updateSection({ ...block, children });
  }

  const dragHandle = (
    <button
      type="button"
      className="cursor-grab rounded border border-border px-2 py-1 text-xs text-muted-foreground active:cursor-grabbing"
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      ⋮⋮
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="space-y-2 rounded-md border border-border bg-card p-3"
    >
      {block.type !== 'section' ? (
        <div className="flex gap-2">
          <div className="pt-1">{dragHandle}</div>
          <div className="min-w-0 flex-1">
            <LeafEditor leaf={block} onChange={(next) => onChange(next)} onRemove={onRemove} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {dragHandle}
            <span className="text-sm font-medium">Section</span>
            <span className="flex-1" />
            <Button type="button" variant="outline" size="sm" onClick={onRemove}>
              Remove
            </Button>
          </div>
          <label className="grid max-w-xs gap-1 text-sm">
            <span>Columns</span>
            <select
              className={fieldClass}
              value={block.columns}
              onChange={(e) =>
                updateSection(
                  resizeSectionColumns(block, Number(e.target.value) as 1 | 2 | 3),
                )
              }
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>
          <div
            className={`grid gap-3 ${
              block.columns === 1
                ? 'grid-cols-1'
                : block.columns === 2
                  ? 'md:grid-cols-2'
                  : 'md:grid-cols-3'
            }`}
          >
            {block.children.map((col, colIndex) => (
              <div
                key={colIndex}
                className="space-y-2 rounded border border-dashed border-border p-2"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  Column {colIndex + 1}
                </p>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ['paragraph', emptyParagraph],
                      ['heading', emptyHeading],
                      ['markdown', emptyMarkdown],
                      ['image', emptyImage],
                      ['button', emptyButton],
                      ['product', emptyProduct],
                      ['offer', emptyOffer],
                    ] as const
                  ).map(([label, factory]) => (
                    <Button
                      key={label}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addColumnLeaf(colIndex, factory())}
                    >
                      + {label}
                    </Button>
                  ))}
                </div>
                {col.map((leaf, leafIndex) => (
                  <LeafEditor
                    key={`${colIndex}-${leafIndex}`}
                    leaf={leaf}
                    onChange={(next) => updateColumnLeaf(colIndex, leafIndex, next)}
                    onRemove={() => removeColumnLeaf(colIndex, leafIndex)}
                    onMoveUp={
                      leafIndex > 0
                        ? () => moveColumnLeaf(colIndex, leafIndex, -1)
                        : undefined
                    }
                    onMoveDown={
                      leafIndex < col.length - 1
                        ? () => moveColumnLeaf(colIndex, leafIndex, 1)
                        : undefined
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type ContentPageBlockEditorProps = {
  readonly body: ContentBlock[];
  readonly onChange: (next: ContentBlock[]) => void;
  readonly disabled?: boolean;
};

export function ContentPageBlockEditor({
  body,
  onChange,
  disabled = false,
}: ContentPageBlockEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = body.map((block, index) => blockId(block, index));

  function addBlock(block: ContentBlock) {
    onChange([...body, block]);
  }

  function updateAt(index: number, next: ContentBlock) {
    onChange(body.map((b, i) => (i === index ? next : b)));
  }

  function removeAt(index: number) {
    onChange(body.filter((_, i) => i !== index));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(body, oldIndex, newIndex));
  }

  return (
    <div className={`space-y-3 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock(emptyParagraph())}>
          Paragraph
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock(emptyHeading())}>
          Heading
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock(emptyMarkdown())}>
          Markdown
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock(emptyImage())}>
          Image
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock(emptyButton())}>
          Button
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock(emptyProduct())}>
          Product
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock(emptyOffer())}>
          Offer
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock(emptySection(2))}>
          Section (2-col)
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {body.map((block, index) => {
              const id = ids[index] ?? blockId(block, index);
              return (
                <SortableTopBlock
                  key={id}
                  id={id}
                  block={block}
                  onChange={(next) => updateAt(index, next)}
                  onRemove={() => removeAt(index)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {body.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add blocks from the palette above.</p>
      ) : null}
    </div>
  );
}
