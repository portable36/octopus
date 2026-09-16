import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Shared control chrome — controls use border-input; panels use border-border. */
export const fieldClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-foreground';

export const formClass =
  'max-w-2xl space-y-4 rounded-lg border border-border bg-card p-4 text-card-foreground';

export const hintClass = 'text-xs font-normal text-muted-foreground';

export const checkboxClass =
  'h-4 w-4 shrink-0 rounded border border-input text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

type FieldProps = {
  readonly label: string;
  readonly htmlFor?: string;
  readonly hint?: string;
  readonly className?: string;
  readonly children: ReactNode;
};

export function Field({ label, htmlFor, hint, className, children }: FieldProps) {
  return (
    <label htmlFor={htmlFor} className={cn(labelClass, className)}>
      <span>{label}</span>
      {children}
      {hint ? <span className={hintClass}>{hint}</span> : null}
    </label>
  );
}
