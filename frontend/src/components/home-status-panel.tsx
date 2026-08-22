'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchHealthLive } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/ui.store';

export function HomeStatusPanel() {
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  const healthQuery = useQuery({
    queryKey: ['health', 'live'],
    queryFn: fetchHealthLive,
  });

  return (
    <section className="grid gap-6 rounded-lg border border-border p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Platform status</h2>
          <p className="text-sm text-muted-foreground">
            Frontend scaffold connected to backend health probe.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={toggleSidebar}>
          {sidebarOpen ? 'Hide demo panel' : 'Show demo panel'}
        </Button>
      </div>

      {sidebarOpen ? (
        <p className="text-sm text-muted-foreground">
          Zustand UI store is active. Replace this panel with storefront navigation in later phases.
        </p>
      ) : null}

      <dl className="grid gap-2 text-sm">
        <div className="flex gap-2">
          <dt className="font-medium">Backend liveness:</dt>
          <dd>
            {healthQuery.isLoading && 'Checking…'}
            {healthQuery.isError && 'Unavailable'}
            {healthQuery.isSuccess && healthQuery.data.status}
          </dd>
        </div>
      </dl>
    </section>
  );
}
