'use client';

import { useParams } from 'next/navigation';
import { ProductEditorShell } from '@/components/vendor/catalog/product-editor-shell';

export default function VendorProductDetailPage() {
  const params = useParams<{ vendorId: string; productId: string }>();
  return <ProductEditorShell vendorId={params.vendorId} productId={params.productId} />;
}
