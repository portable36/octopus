import { buildPublishChecklist, type ProductEditorState } from '@/lib/vendor-catalog-flow';

type PublishChecklistProps = {
  readonly state: {
    readonly product: ProductEditorState['product'];
    readonly variants: readonly ProductEditorState['variants'][number][];
    readonly offers: readonly ProductEditorState['offers'][number][];
    readonly availability: ProductEditorState['availability'];
    readonly storeId: string | null;
  };
};

export function PublishChecklist({ state }: PublishChecklistProps) {
  const items = buildPublishChecklist(state);

  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2">
          <span
            className={
              item.met
                ? 'text-emerald-600'
                : item.optional
                  ? 'text-muted-foreground'
                  : 'text-destructive'
            }
            aria-hidden
          >
            {item.met ? '✓' : item.optional ? '○' : '✗'}
          </span>
          <span className={item.met ? '' : item.optional ? 'text-muted-foreground' : ''}>
            {item.label}
            {item.optional ? ' (optional)' : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}
