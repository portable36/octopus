import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { AdminWidget } from '@/components/layout/admin-widget';
import { DashboardHealthWidget } from '@/features/dashboard/dashboard-health-widget';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="Operational overview. Widget failures stay isolated from the page shell."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <AdminWidget title="API readiness">
          <DashboardHealthWidget />
        </AdminWidget>
        <AdminWidget title="KPI placeholders">
          <p className="text-sm text-muted-foreground">
            Live order/payment aggregates arrive with Phase 21 read models. Foundation ships stub
            cards only.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Vendors</dt>
              <dd className="text-xl font-semibold">—</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Stores</dt>
              <dd className="text-xl font-semibold">—</dd>
            </div>
          </dl>
        </AdminWidget>
      </div>
    </div>
  );
}
