import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  base64ToUint8Array,
  downloadEscPosBinFile,
  isWebSerialSupported,
  printEscPosViaWebSerial,
} from './pos-thermal-printer';

describe('POS Thermal Printer Utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('converts base64 to Uint8Array accurately', () => {
    // "Hello" in base64: SGVsbG8=
    const bytes = base64ToUint8Array('SGVsbG8=');
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(5);
    expect(bytes[0]).toBe(72); // 'H'
    expect(bytes[4]).toBe(111); // 'o'
  });

  it('triggers browser file download for ESC/POS binary file', () => {
    const mockClick = vi.fn();
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });

    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({
        set href(_val: string) {},
        set download(_val: string) {},
        click: mockClick,
      })),
      body: {
        appendChild: mockAppendChild,
        removeChild: mockRemoveChild,
      },
    });

    downloadEscPosBinFile('SGVsbG8=', 'test-receipt.bin');

    expect(mockClick).toHaveBeenCalled();
    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();
  });

  it('detects when Web Serial is not supported', async () => {
    vi.stubGlobal('navigator', {});
    expect(isWebSerialSupported()).toBe(false);

    const res = await printEscPosViaWebSerial('SGVsbG8=');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Web Serial API is not supported');
  });

  it('transfers binary payload via Web Serial when supported', async () => {
    const mockWrite = vi.fn();
    const mockReleaseLock = vi.fn();
    const mockClose = vi.fn();
    const mockOpen = vi.fn();

    vi.stubGlobal('navigator', {
      serial: {
        requestPort: vi.fn(async () => ({
          open: mockOpen,
          writable: {
            getWriter: () => ({
              write: mockWrite,
              releaseLock: mockReleaseLock,
            }),
          },
          close: mockClose,
        })),
      },
    });

    expect(isWebSerialSupported()).toBe(true);

    const res = await printEscPosViaWebSerial('SGVsbG8=');
    expect(res.success).toBe(true);
    expect(mockOpen).toHaveBeenCalledWith({ baudRate: 9600 });
    expect(mockWrite).toHaveBeenCalled();
    expect(mockReleaseLock).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });
});
