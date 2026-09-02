'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { fieldClass, formClass, labelClass } from '@/components/vendor/catalog/catalog-styles';
import { updateVendorProduct, type CatalogCategory, type VendorProduct } from '@/lib/vendor-api';

type GeneralSectionProps = {
  readonly product: VendorProduct;
  readonly categories: readonly CatalogCategory[];
  readonly disabled?: boolean;
  readonly onSaved: (product: VendorProduct) => void;
  readonly onError: (message: string) => void;
};

export function GeneralSection({
  product,
  categories,
  disabled = false,
  onSaved,
  onError,
}: GeneralSectionProps) {
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? '');
  const [categoryIds, setCategoryIds] = useState<string[]>([...product.categoryIds]);

  function toggleCategory(categoryId: string) {
    setCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const updated = await updateVendorProduct(product.id, {
        name: name.trim(),
        description: description.trim() || null,
        categoryIds,
      });
      onSaved(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save general details.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={formClass} onSubmit={onSubmit}>
      <div>
        <h3 className="text-sm font-medium">General</h3>
        <p className="text-sm text-muted-foreground">Name, description, and categories.</p>
      </div>
      <label className={labelClass}>
        Name
        <input
          className={fieldClass}
          name="name"
          required
          minLength={3}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={disabled || pending}
        />
      </label>
      <label className={labelClass}>
        Description
        <textarea
          className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={disabled || pending}
        />
      </label>
      {categories.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Categories</legend>
          <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {categories.map((category) => (
              <label key={category.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={categoryIds.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                  disabled={disabled || pending}
                />
                {category.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="text-sm text-muted-foreground">No categories available yet.</p>
      )}
      <Button type="submit" disabled={disabled || pending}>
        {pending ? 'Saving…' : 'Save general'}
      </Button>
    </form>
  );
}
