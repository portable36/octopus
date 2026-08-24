import { Suspense, type ReactNode } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';

export default function AdminSectionLayout({ children }: { readonly children: ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading admin…</div>}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
