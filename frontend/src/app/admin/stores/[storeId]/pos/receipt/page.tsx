import { ReceiptTemplateSettings } from '@/components/pos/receipt-template-settings';

type PageProps = {
  readonly params: Promise<{ storeId: string }>;
  readonly searchParams: Promise<{ token?: string }>;
};

export default async function StoreReceiptSettingsPage({ params, searchParams }: PageProps) {
  const { storeId } = await params;
  const { token } = await searchParams;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-sm uppercase tracking-wide text-neutral-500">POS · Store settings</p>
        <h1 className="text-2xl font-semibold tracking-tight">Sales receipt</h1>
        <p className="max-w-2xl text-sm text-neutral-600">
          Customize the store header, thank-you message, and returns policy. Line totals and payment
          amounts always come from the completed sale snapshot.
        </p>
      </header>
      <ReceiptTemplateSettings storeId={storeId} accessToken={token} />
    </main>
  );
}
