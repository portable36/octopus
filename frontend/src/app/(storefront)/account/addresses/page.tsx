'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { addAddress, deleteAddress, listAddresses, type CustomerAddress } from '@/lib/account-api';

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reload = useCallback(async () => {
    try {
      setAddresses(await listAddresses());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load addresses.');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await addAddress({
        label: String(form.get('label') || '').trim(),
        recipientName: String(form.get('recipientName') || '').trim(),
        phone: String(form.get('phone') || '').trim() || null,
        line1: String(form.get('line1') || '').trim(),
        line2: String(form.get('line2') || '').trim() || null,
        city: String(form.get('city') || '').trim(),
        region: String(form.get('region') || '').trim() || null,
        postalCode: String(form.get('postalCode') || '').trim() || null,
        countryCode: String(form.get('countryCode') || 'BD')
          .trim()
          .toUpperCase(),
        isDefault: form.get('isDefault') === 'on',
      });
      event.currentTarget.reset();
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not add address.');
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string) {
    setPending(true);
    try {
      await deleteAddress(id);
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Delete failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Addresses</h1>
        <p className="text-sm text-muted-foreground">
          Owner-scoped address book from Customer API.
        </p>
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
      ) : (
        <ul className="divide-y divide-border border border-border">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
            >
              <div className="text-sm">
                <p className="font-medium">
                  {address.label}
                  {address.isDefault ? ' · default' : ''}
                </p>
                <p>
                  {address.recipientName}
                  {address.phone ? ` · ${address.phone}` : ''}
                </p>
                <p className="text-muted-foreground">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ''}
                  <br />
                  {address.city}
                  {address.region ? `, ${address.region}` : ''} {address.postalCode ?? ''}{' '}
                  {address.countryCode}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => void onDelete(address.id)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => void onAdd(e)} className="space-y-3 border border-border p-4">
        <h2 className="text-sm font-medium">Add address</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Label</span>
            <input
              name="label"
              required
              className="h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Recipient</span>
            <input
              name="recipientName"
              required
              className="h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Phone</span>
          <input name="phone" className="h-10 rounded-md border border-border bg-background px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Line 1</span>
          <input
            name="line1"
            required
            className="h-10 rounded-md border border-border bg-background px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Line 2</span>
          <input name="line2" className="h-10 rounded-md border border-border bg-background px-3" />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">City</span>
            <input
              name="city"
              required
              className="h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Region</span>
            <input
              name="region"
              className="h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Postal</span>
            <input
              name="postalCode"
              className="h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm sm:w-32">
          <span className="text-muted-foreground">Country</span>
          <input
            name="countryCode"
            defaultValue="BD"
            required
            maxLength={2}
            className="h-10 rounded-md border border-border bg-background px-3 uppercase"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isDefault" />
          Default address
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Add address'}
        </Button>
      </form>
    </div>
  );
}
