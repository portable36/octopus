'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { fetchMe, type MeResponse } from '@/lib/auth-api';
import { fetchProfile, updateProfile, type CustomerProfile } from '@/lib/account-api';

export default function AccountProfilePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [meRes, profileRes] = await Promise.all([fetchMe(), fetchProfile()]);
        setMe(meRes);
        setProfile(profileRes);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load profile.');
      }
    })();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setSaved(false);
    setError(null);
    try {
      const next = await updateProfile({
        displayName: String(form.get('displayName') || '').trim(),
        phone: String(form.get('phone') || '').trim() || null,
      });
      setProfile(next);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Save failed.');
    } finally {
      setPending(false);
    }
  }

  if (!profile && !error) {
    return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        {me ? (
          <p className="text-sm text-muted-foreground">
            {me.email} · roles {me.roles.join(', ')}
          </p>
        ) : null}
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-muted-foreground" role="status">
          Saved.
        </p>
      ) : null}

      {profile ? (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 border border-border p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Display name</span>
            <input
              name="displayName"
              defaultValue={profile.displayName}
              required
              className="h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Phone</span>
            <input
              name="phone"
              defaultValue={profile.phone ?? ''}
              className="h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
