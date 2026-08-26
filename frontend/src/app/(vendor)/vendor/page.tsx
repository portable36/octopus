'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { listMyVendors, registerVendor, type VendorSummary } from '@/lib/vendor-api';

export default function VendorPickerPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<VendorSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listMyVendors();
        if (cancelled) {
          return;
        }
        if (rows.length === 1 && rows[0]) {
          router.replace(`/vendor/${rows[0].id}`);
          return;
        }
        setVendors(rows);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load vendors.');
          setVendors([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const created = await registerVendor({
        displayName: String(form.get('displayName') || '').trim(),
        legalName: String(form.get('legalName') || '').trim(),
        contactEmail: String(form.get('contactEmail') || '').trim(),
      });
      router.push(`/vendor/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Registration failed.');
    } finally {
      setPending(false);
    }
  }

  if (vendors === null && !error) {
    return <p className="text-sm text-muted-foreground">Loading vendors…</p>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Your vendors</h2>
        <p className="text-sm text-muted-foreground">
          Pick a vendor to open the ops portal, or register a new one.
        </p>
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {vendors && vendors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No vendors yet. Use the form below to register (POST /vendors). Full onboarding UI comes
          later.
        </p>
      ) : null}

      {vendors && vendors.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {vendors.map((vendor) => (
            <li key={vendor.id}>
              <Link
                href={`/vendor/${vendor.id}`}
                className="block rounded-md border border-border bg-background p-4 hover:bg-muted"
              >
                <p className="font-medium">{vendor.profile.displayName}</p>
                <p className="text-xs text-muted-foreground">/{vendor.profile.slug}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                  {vendor.status}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        onSubmit={(e) => void onCreate(e)}
        className="max-w-md space-y-3 rounded-md border border-border bg-background p-4"
      >
        <p className="text-sm font-medium">Register vendor</p>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Display name</span>
          <input
            name="displayName"
            required
            minLength={2}
            className="h-10 rounded-md border border-border bg-background px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Legal name</span>
          <input
            name="legalName"
            required
            minLength={2}
            className="h-10 rounded-md border border-border bg-background px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Contact email</span>
          <input
            name="contactEmail"
            type="email"
            required
            className="h-10 rounded-md border border-border bg-background px-3"
          />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create vendor'}
        </Button>
      </form>
    </div>
  );
}
