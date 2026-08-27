'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { LockFieldIcon } from '@/components/auth/field-with-icon';
import { cn } from '@/lib/cn';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-muted-foreground"
        aria-hidden="true"
      >
        <LockFieldIcon />
      </span>
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn(
          'h-11 w-full rounded-md border border-border bg-background py-2 pl-10 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary',
          className,
        )}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.5 5.2A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-2.1 2.9M6.2 6.2C3.9 7.9 2 12 2 12s3.5 7 10 7c1.5 0 2.9-.3 4.1-.8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
