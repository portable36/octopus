'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { sectionNavActiveClass, sectionNavClass } from '@/components/vendor/catalog/catalog-styles';
import { StoreWizardStepContent } from '@/components/vendor/store-wizard/store-wizard-steps';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { getVendor, type VendorSummary } from '@/lib/vendor-api';
import {
  mergePayload,
  updateStoreDraft,
  validateStoreDraft,
  WIZARD_STEPS,
  type StoreOnboardingDraft,
  type StoreWizardPayload,
  type StoreWizardStep,
} from '@/lib/store-wizard-flow';
import { setSelectedStoreId } from '@/lib/vendor-session';

type StoreWizardShellProps = {
  readonly vendorId: string;
  readonly draft: StoreOnboardingDraft;
  readonly backHref?: string;
  readonly successHref?: (storeId: string) => string;
};

export function StoreWizardShell({
  vendorId,
  draft: initialDraft,
  backHref,
  successHref,
}: StoreWizardShellProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [step, setStep] = useState<StoreWizardStep>(initialDraft.currentStep);
  const [payload, setPayload] = useState<StoreWizardPayload>(initialDraft.payload ?? {});
  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const storesBackHref = backHref ?? `/vendor/${vendorId}/stores`;

  useEffect(() => {
    void getVendor(vendorId)
      .then(setVendor)
      .catch(() => setVendor(null));
  }, [vendorId]);

  const onSectionChange = useCallback(
    (section: keyof StoreWizardPayload, data: StoreWizardPayload[keyof StoreWizardPayload]) => {
      setPayload((current) => mergePayload(current, section, data));
    },
    [],
  );

  async function saveDraft(nextStep: StoreWizardStep) {
    setPending(true);
    setError(null);
    try {
      const updated = await updateStoreDraft(draft.id, { currentStep: nextStep, payload });
      setDraft(updated);
      setStep(nextStep);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to save draft.');
    } finally {
      setPending(false);
    }
  }

  async function onBack() {
    if (step <= 1) return;
    await saveDraft((step - 1) as StoreWizardStep);
  }

  async function onNext() {
    if (step >= 17) return;
    await saveDraft((step + 1) as StoreWizardStep);
  }

  async function onSaveDraft() {
    await saveDraft(step);
  }

  async function onSubmit() {
    setPending(true);
    setError(null);
    setValidationErrors([]);
    try {
      await updateStoreDraft(draft.id, { currentStep: 17, payload });
      const validation = await validateStoreDraft(draft.id);
      if (!validation.valid) {
        setValidationErrors([...validation.errors]);
        return;
      }
      const { submitStoreDraft } = await import('@/lib/store-wizard-flow');
      const result = await submitStoreDraft(draft.id);
      setSelectedStoreId(result.storeId);
      router.push(
        successHref
          ? successHref(result.storeId)
          : `/vendor/${vendorId}/stores/${result.storeId}/setup`,
      );
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to submit store.');
    } finally {
      setPending(false);
    }
  }

  const current = WIZARD_STEPS.find((s) => s.step === step);

  return (
    <div className="space-y-6">
      <header>
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href={storesBackHref}
        >
          ← Stores
        </Link>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">Create store</h2>
        <p className="text-sm text-muted-foreground">
          Step {step} of 17 — {current?.label}
        </p>
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {validationErrors.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
          {validationErrors.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="hidden max-h-[70vh] flex-col gap-0.5 overflow-y-auto lg:flex">
          {WIZARD_STEPS.map((item) => (
            <button
              key={item.step}
              type="button"
              disabled={pending}
              className={cn(sectionNavClass, step === item.step && sectionNavActiveClass)}
              onClick={() => void saveDraft(item.step)}
            >
              <span className="text-xs text-muted-foreground">{item.step}.</span> {item.label}
            </button>
          ))}
        </nav>

        <div className="space-y-4 rounded-md border border-border bg-background p-4">
          <h3 className="text-sm font-medium">{current?.label}</h3>
          <StoreWizardStepContent
            step={step}
            payload={payload}
            onChange={onSectionChange}
            vendorName={vendor?.profile.displayName}
          />

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={pending || step <= 1}
              onClick={() => void onBack()}
            >
              Back
            </Button>
            {step < 17 ? (
              <Button type="button" disabled={pending} onClick={() => void onNext()}>
                Next
              </Button>
            ) : (
              <Button type="button" disabled={pending} onClick={() => void onSubmit()}>
                {pending ? 'Creating…' : 'Create store'}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => void onSaveDraft()}
            >
              Save draft
            </Button>
            <Link
              href={`/vendor/${vendorId}/stores`}
              className="inline-flex min-h-10 items-center px-3 text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
