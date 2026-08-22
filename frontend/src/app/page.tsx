import { HomeStatusPanel } from '@/components/home-status-panel';
import { getPublicAppName } from '@/lib/env';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Phase 00</p>
        <h1 className="text-3xl font-semibold tracking-tight">{getPublicAppName()}</h1>
        <p className="max-w-2xl text-muted-foreground">
          Next.js App Router foundation with Tailwind, TanStack Query, Zustand, Radix Slot-based UI
          primitives, typed fetch API client, and localized error boundaries.
        </p>
      </header>
      <HomeStatusPanel />
    </main>
  );
}
