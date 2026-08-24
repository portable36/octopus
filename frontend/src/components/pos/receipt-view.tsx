'use client';

type ReceiptViewProps = {
  readonly text: string;
  readonly paperWidth?: 58 | 80;
};

export function ReceiptView({ text, paperWidth = 80 }: ReceiptViewProps) {
  const chars = paperWidth === 58 ? 32 : 42;

  return (
    <pre
      className="receipt-print overflow-auto rounded border border-neutral-300 bg-white p-4 font-mono text-[11px] leading-4 text-neutral-900 shadow-sm"
      style={{ width: `${Math.max(16, chars)}ch`, maxWidth: '100%' }}
      aria-label="Sales receipt preview"
    >
      {text}
    </pre>
  );
}
