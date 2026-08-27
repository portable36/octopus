import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type FieldWithIconProps = InputHTMLAttributes<HTMLInputElement> & {
  readonly icon: ReactNode;
};

export function FieldWithIcon({ icon, className, ...props }: FieldWithIconProps) {
  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-muted-foreground"
        aria-hidden="true"
      >
        {icon}
      </span>
      <input
        {...props}
        className={cn(
          'h-11 w-full rounded-md border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary',
          className,
        )}
      />
    </div>
  );
}

export function UserFieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 19" fill="none" aria-hidden="true">
      <path
        d="M16.345 17.405c.553-.115.882-.693.607-1.187a9.9 9.9 0 0 0-2.78-3.772C12.6 11.509 10.675 11 8.693 11s-3.908.509-5.479 1.446a9.9 9.9 0 0 0-2.78 3.772c-.275.494.054 1.072.607 1.187a31.6 31.6 0 0 0 15.304 0Z"
        fill="currentColor"
        opacity="0.55"
      />
      <circle cx="8.693" cy="5" r="5" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

export function LockFieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 20" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 5a5 5 0 0 1 10 0v1a1 1 0 1 1-2 0V5a3 3 0 0 0-6 0v1a1 1 0 0 1-2 0V5Z"
        fill="currentColor"
        opacity="0.55"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M.879 5.879C0 6.757 0 8.172 0 11v1c0 3.771 0 5.657 1.172 6.828C2.343 20 4.229 20 8 20h2c3.771 0 5.657 0 6.828-1.172C18 17.657 18 15.771 18 12v-1c0-2.828 0-4.243-.879-5.121C16.243 5 14.828 5 12 5H6C3.172 5 1.757 5 .879 5.879ZM9 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm3-1a3 3 0 0 1-2 2.829V17H8v-2.171A3 3 0 1 1 12 12Z"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  );
}
