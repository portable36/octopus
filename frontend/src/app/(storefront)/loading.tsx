export default function StorefrontLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-4 w-full max-w-xl rounded bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-24 rounded border border-border bg-muted/40" />
        <div className="h-24 rounded border border-border bg-muted/40" />
        <div className="h-24 rounded border border-border bg-muted/40" />
      </div>
    </div>
  );
}
