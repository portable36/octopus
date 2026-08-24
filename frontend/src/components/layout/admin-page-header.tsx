export function AdminPageHeader({
  title,
  description,
}: {
  readonly title: string;
  readonly description?: string;
}) {
  return (
    <header className="space-y-1">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {description ? (
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      ) : null}
    </header>
  );
}
