/**
 * Utilities for ESC/POS thermal receipt printing in the browser.
 */

export function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function downloadEscPosBinFile(base64: string, filename = 'receipt-escpos.bin'): void {
  if (typeof document === 'undefined') return;
  const bytes = base64ToUint8Array(base64);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator) && 'serial' in navigator;
}

interface SerialPortHandle {
  open(options: { baudRate: number }): Promise<void>;
  writable: {
    getWriter(): {
      write(chunk: Uint8Array): Promise<void>;
      releaseLock(): void;
    };
  };
  close(): Promise<void>;
}

export async function printEscPosViaWebSerial(
  base64: string,
  baudRate = 9600,
): Promise<{ success: boolean; error?: string }> {
  if (!isWebSerialSupported()) {
    return {
      success: false,
      error: 'Web Serial API is not supported in this browser. Use Chrome, Edge, or Opera.',
    };
  }

  try {
    const nav = navigator as unknown as {
      serial: { requestPort: () => Promise<SerialPortHandle> };
    };
    const port = await nav.serial.requestPort();
    await port.open({ baudRate });

    const writer = port.writable.getWriter();
    const bytes = base64ToUint8Array(base64);

    await writer.write(bytes);
    writer.releaseLock();
    await port.close();

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to communicate with serial printer.';
    return { success: false, error: message };
  }
}
