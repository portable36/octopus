'use client';

import { Suspense } from 'react';
import { AdminStoresList } from '@/components/admin/admin-stores-list';

export default function AdminStoresPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <AdminStoresList />
    </Suspense>
  );
}
