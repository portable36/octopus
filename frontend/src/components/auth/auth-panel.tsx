import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

type AuthTab = 'login' | 'register';

export function AuthPanel({
  title,
  description,
  activeTab,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly activeTab: AuthTab;
  readonly children: ReactNode;
}) {
  return (
    <div className="-mx-4 flex min-h-[calc(100vh-12rem)] items-center justify-center bg-background px-4 py-10 md:-mx-6 md:px-6">
      <div className="w-full max-w-[440px] rounded-lg border border-border bg-background p-6 shadow-sm sm:p-8">
        <div className="mb-6 grid grid-cols-2 text-center text-sm font-semibold">
          <Link
            href="/login"
            className={cn(
              'border-b-2 pb-3 transition-colors',
              activeTab === 'login'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className={cn(
              'border-b-2 pb-3 transition-colors',
              activeTab === 'register'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            Sign up
          </Link>
        </div>
        <header className="mb-6 space-y-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </header>
        {children}
      </div>
    </div>
  );
}
