'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CashierBalancing } from '@/components/pos/cashier-balancing';
import { ReceiptTemplateSettings } from '@/components/pos/receipt-template-settings';
import { RegisterManagement } from '@/components/pos/register-management';
import { useAccessToken } from '@/lib/use-access-token';

type PosTab = 'balancing' | 'registers' | 'receipts';

export default function AdminStorePosPage() {
  const params = useParams<{ storeId: string }>();
  const token = useAccessToken();
  const storeId = params.storeId;
  const [activeTab, setActiveTab] = useState<PosTab>('balancing');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Point of Sale (POS)</h2>
          <p className="text-xs text-muted-foreground">
            Multi-register cashier balancing, physical counter management, offline sync, and ESC/POS
            thermal printing.
          </p>
        </div>
        <p className="text-xs">
          <Link
            href={`/admin/stores/${storeId}/pos/receipt`}
            className="underline underline-offset-2 text-muted-foreground hover:text-foreground"
          >
            Open dedicated receipt page →
          </Link>
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('balancing')}
          className={`border-b-2 px-4 py-2 font-medium transition-colors ${
            activeTab === 'balancing'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Cashier Balancing & Offline Sync
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('registers')}
          className={`border-b-2 px-4 py-2 font-medium transition-colors ${
            activeTab === 'registers'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Registers & Counters
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('receipts')}
          className={`border-b-2 px-4 py-2 font-medium transition-colors ${
            activeTab === 'receipts'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Receipt Template & ESC/POS
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'balancing' && (
        <section className="space-y-4">
          {token ? (
            <CashierBalancing storeId={storeId} accessToken={token} />
          ) : (
            <p className="text-xs text-muted-foreground">
              Sign in required to view cashier balancing.
            </p>
          )}
        </section>
      )}

      {activeTab === 'registers' && (
        <section className="border border-border bg-background p-4 text-sm">
          {token ? (
            <RegisterManagement storeId={storeId} accessToken={token} />
          ) : (
            <p className="text-xs text-muted-foreground">Sign in required to manage registers.</p>
          )}
        </section>
      )}

      {activeTab === 'receipts' && (
        <section className="space-y-3">
          {token ? (
            <ReceiptTemplateSettings storeId={storeId} accessToken={token} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Sign in required to edit receipt template.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
