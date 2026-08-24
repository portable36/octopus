import { ReceiptTemplateSettings } from '@/components/pos/receipt-template-settings';

type PageProps = {
  readonly params: Promise<{ storeId: string }>;
  readonly searchParams: Promise<{ token?: string }>;
};

export default async function StoreReceiptSettingsPage({ params, searchParams }: PageProps) {
  const { storeId } = await params;
  const { token } = await searchParams;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          POS · Store settings
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Sales receipt</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Customize the store header, thank-you message, and returns policy. Line totals and payment
          amounts always come from the completed sale snapshot.
        </p>
      </header>
      <ReceiptTemplateSettings storeId={storeId} accessToken={token} />
    </div>
  );
}
