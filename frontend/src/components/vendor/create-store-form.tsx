'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function CreateStoreForm({
  vendorId,
  vendorStatus,
}: {
  readonly vendorId: string;
  readonly vendorStatus: string | null;
}) {
  const router = useRouter();

  if (vendorStatus === 'pending') {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Submit your vendor profile for review before creating stores.</p>
        <Link className="underline underline-offset-4" href={`/vendor/${vendorId}`}>
          Go to dashboard
        </Link>
      </div>
    );
  }

  if (vendorStatus !== 'active') {
    return (
      <p className="text-sm text-muted-foreground">
        Stores can be created after your vendor account is active.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Use the guided wizard to set up identity, location, payments, inventory, and branding.
      </p>
      <Button type="button" onClick={() => router.push(`/vendor/${vendorId}/stores/new`)}>
        Create store
      </Button>
    </div>
  );
}
