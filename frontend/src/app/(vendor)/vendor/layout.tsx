import { Suspense, type ReactNode } from 'react';
import { VendorShell } from '@/components/layout/vendor-shell';

export default function VendorSectionLayout({ children }: { readonly children: ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading vendor…</div>}>
      <VendorShell>{children}</VendorShell>
    </Suspense>
  );
}
