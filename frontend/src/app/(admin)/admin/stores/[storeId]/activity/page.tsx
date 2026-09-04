'use client';

export default function AdminStoreActivityPage() {
  return (
    <div className="space-y-3 border border-border bg-background p-4 text-sm">
      <h2 className="font-medium">Activity</h2>
      <p className="text-muted-foreground">
        Store-scoped audit listing is not wired yet. Platform audit events live under Security
        (`/admin/system/security`); a store filter lands with STORE-20.
      </p>
      {/* TODO(STORE-20): list AUDIT_PORT events filtered by storeId */}
    </div>
  );
}
