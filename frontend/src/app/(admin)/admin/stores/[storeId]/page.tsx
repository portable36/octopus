import { redirect } from 'next/navigation';

export default async function AdminStoreIndexPage({
  params,
}: {
  readonly params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  redirect(`/admin/stores/${storeId}/overview`);
}
