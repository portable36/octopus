'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formClass } from '@/components/vendor/catalog/catalog-styles';
import { PublishChecklist } from '@/components/vendor/catalog/publish-checklist';
import { buildPublishChecklist } from '@/lib/vendor-catalog-flow';
import {
  archiveProduct,
  publishProduct,
  submitProductReview,
  unpublishProduct,
  type StockAvailability,
  type StoreOffer,
  type VendorProduct,
  type VendorVariant,
} from '@/lib/vendor-api';

type PublishSectionProps = {
  readonly product: VendorProduct;
  readonly variants: readonly VendorVariant[];
  readonly offers: readonly StoreOffer[];
  readonly availability: StockAvailability | null;
  readonly storeId: string | null;
  readonly disabled?: boolean;
  readonly onSaved: (product: VendorProduct) => void;
  readonly onMessage: (message: string) => void;
  readonly onError: (message: string) => void;
};

export function PublishSection({
  product,
  variants,
  offers,
  availability,
  storeId,
  disabled = false,
  onSaved,
  onMessage,
  onError,
}: PublishSectionProps) {
  const [pending, setPending] = useState(false);
  const checklist = buildPublishChecklist({
    product,
    variants,
    offers,
    availability,
    storeId,
  });
  const requiredMet = checklist.filter((item) => !item.optional).every((item) => item.met);

  async function runLifecycle(
    action: (productId: string) => Promise<VendorProduct>,
    successMessage: string,
  ) {
    setPending(true);
    try {
      const updated = await action(product.id);
      onSaved(updated);
      onMessage(successMessage);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Lifecycle action failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={formClass}>
      <div>
        <h3 className="text-sm font-medium">Publish</h3>
        <p className="text-sm text-muted-foreground">
          Review readiness, then submit for review or publish when ready.
        </p>
      </div>

      <p className="text-sm">
        Current status: <span className="font-medium">{product.status}</span>
      </p>

      {product.status === 'pending_review' ? (
        <p className="text-sm text-muted-foreground">
          This product is pending review. Platform admins can publish it after approval.
        </p>
      ) : null}

      <PublishChecklist
        state={{
          product,
          variants,
          offers,
          availability,
          storeId,
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || pending || !requiredMet}
          onClick={() => void runLifecycle(submitProductReview, 'Submitted for review.')}
        >
          Submit for review
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || pending || !requiredMet}
          onClick={() => void runLifecycle(publishProduct, 'Published.')}
        >
          Publish
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || pending}
          onClick={() => void runLifecycle(unpublishProduct, 'Unpublished.')}
        >
          Unpublish
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || pending}
          onClick={() => void runLifecycle(archiveProduct, 'Archived.')}
        >
          Archive
        </Button>
      </div>
    </div>
  );
}
