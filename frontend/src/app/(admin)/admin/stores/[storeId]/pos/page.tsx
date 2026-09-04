'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ReceiptTemplateSettings } from '@/components/pos/receipt-template-settings';
import { useAccessToken } from '@/lib/use-access-token';

export default function AdminStorePosPage() {
  const params = useParams<{ storeId: string }>();
  const token = useAccessToken();
  const storeId = params.storeId;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium">POS</h2>
        <p className="text-xs text-muted-foreground">
          Registers and shifts land when the POS register domain is ready. Receipt templates are
          available now.
        </p>
        <p className="mt-2 text-sm">
          <Link
            href={`/admin/stores/${storeId}/pos/receipt`}
            className="underline underline-offset-2"
          >
            Open dedicated receipt page
          </Link>
        </p>
      </div>

      <section className="border border-border bg-background p-4 text-sm">
        <h3 className="font-medium">Registers</h3>
        <p className="mt-2 text-muted-foreground">
          No register aggregate yet — placeholder until POS register APIs ship.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Sales receipt template</h3>
        {token ? (
          <ReceiptTemplateSettings storeId={storeId} accessToken={token} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Sign in required to edit receipt template.
          </p>
        )}
      </section>
    </div>
  );
}
