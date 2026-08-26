import Link from 'next/link';

export default function StorefrontNotFound() {
  return (
    <div className="space-y-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
      <p className="text-muted-foreground">That page is missing or not published for shoppers.</p>
      <Link href="/" className="inline-flex text-sm font-medium underline">
        Back home
      </Link>
    </div>
  );
}
