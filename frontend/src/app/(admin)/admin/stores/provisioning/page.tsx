'use client';

import { Suspense } from 'react';
import { AdminStoresList } from '@/components/admin/admin-stores-list';

export default function AdminStoresProvisioningPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <AdminStoresList
        lockedStatus="provisioning,failed"
        title="Provisioning"
        description="Stores currently provisioning or failed — retry from the store detail."
      />
    </Suspense>
  );
}
