'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  downloadEscPosBinFile,
  isWebSerialSupported,
  printEscPosViaWebSerial,
} from '@/lib/pos-thermal-printer';

type ReceiptViewProps = {
  readonly text: string;
  readonly escposBase64?: string;
  readonly escposHex?: string;
  readonly paperWidth?: 58 | 80;
  readonly receiptNumber?: string;
};

export function ReceiptView({
  text,
  escposBase64,
  escposHex,
  paperWidth = 80,
  receiptNumber,
}: ReceiptViewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'escpos'>('preview');
  const [printingSerial, setPrintingSerial] = useState(false);
  const [serialStatus, setSerialStatus] = useState<string | null>(null);

  const chars = paperWidth === 58 ? 32 : 42;
  const filename = receiptNumber ? `receipt-${receiptNumber}.bin` : 'receipt-escpos.bin';

  const handleDownloadBin = () => {
    if (!escposBase64) return;
    downloadEscPosBinFile(escposBase64, filename);
  };

  const handlePrintWebSerial = async () => {
    if (!escposBase64) return;
    setPrintingSerial(true);
    setSerialStatus(null);
    try {
      const result = await printEscPosViaWebSerial(escposBase64);
      if (result.success) {
        setSerialStatus('Sent to thermal printer successfully!');
      } else {
        setSerialStatus(result.error || 'Failed to send to thermal printer.');
      }
    } catch {
      setSerialStatus('Unexpected error during serial printing.');
    } finally {
      setPrintingSerial(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-xs">
        <div className="inline-flex rounded-md border border-input p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`rounded px-2.5 py-1 font-medium transition-colors ${
              viewMode === 'preview'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Thermal Preview ({paperWidth}mm)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('escpos')}
            className={`rounded px-2.5 py-1 font-medium transition-colors ${
              viewMode === 'escpos'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            ESC/POS Raw Bytes
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {escposBase64 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadBin}
              className="h-7 text-xs"
            >
              Download .bin
            </Button>
          )}

          {escposBase64 && isWebSerialSupported() && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintWebSerial}
              disabled={printingSerial}
              className="h-7 text-xs"
            >
              {printingSerial ? 'Printing…' : 'Print via WebSerial'}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-7 text-xs"
          >
            Browser Print
          </Button>
        </div>
      </div>

      {serialStatus && (
        <p
          className={`text-xs ${
            serialStatus.includes('success') ? 'text-emerald-600' : 'text-destructive'
          }`}
        >
          {serialStatus}
        </p>
      )}

      {viewMode === 'preview' ? (
        <pre
          className="receipt-print overflow-auto rounded border border-neutral-300 bg-white p-4 font-mono text-[11px] leading-4 text-neutral-900 shadow-sm"
          style={{ width: `${Math.max(16, chars)}ch`, maxWidth: '100%' }}
          aria-label="Sales receipt preview"
        >
          {text}
        </pre>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Standard ESC/POS thermal command stream (Epson TM series / Star / Munbyn / Xprinter
            compatible):
          </p>
          <pre className="max-h-80 overflow-auto rounded border border-border bg-muted/40 p-3 font-mono text-[11px] text-foreground">
            {escposHex
              ? escposHex
                  .match(/.{1,2}/g)
                  ?.join(' ')
                  .match(/.{1,48}/g)
                  ?.join('\n')
              : escposBase64 || 'No ESC/POS payload generated.'}
          </pre>
        </div>
      )}
    </div>
  );
}
