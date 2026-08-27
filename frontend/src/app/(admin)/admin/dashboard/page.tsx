import { Suspense } from 'react';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { AdminWidget } from '@/components/layout/admin-widget';
import { DashboardHealthWidget } from '@/features/dashboard/dashboard-health-widget';
import { DashboardOpsCountsWidget } from '@/features/dashboard/dashboard-ops-counts-widget';
import { DashboardOrderReportWidget } from '@/features/dashboard/dashboard-order-report-widget';

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
        <AdminWidget title="Operational counts">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            <DashboardOpsCountsWidget />
          </Suspense>
        </AdminWidget>
        <AdminWidget title="Order report (read model)">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            <DashboardOrderReportWidget />
          </Suspense>
        </AdminWidget>
      </div>
    </div>
  );
}
