export type BarcodeIdentifierType = 'BARCODE' | 'GTIN' | 'EAN' | 'UPC' | 'ISBN';

const LENGTHS: Record<BarcodeIdentifierType, readonly number[]> = {
  BARCODE: [],
  GTIN: [8, 12, 13, 14],
  EAN: [8, 13],
  UPC: [12],
  ISBN: [10, 13],
};

export class BarcodeIdentifier {
  private constructor(
    public readonly type: BarcodeIdentifierType,
    public readonly value: string,
  ) {}

  public static create(type: BarcodeIdentifierType, rawValue: string): BarcodeIdentifier {
    const value = rawValue.trim().toUpperCase();
    if (!value) {
      throw new Error('Barcode identifier cannot be empty.');
    }

    if (type !== 'BARCODE' && !/^\d+$/.test(value)) {
      throw new Error(`${type} must contain digits only.`);
    }

    const allowedLengths = LENGTHS[type];
    if (allowedLengths.length > 0 && !allowedLengths.includes(value.length)) {
      throw new Error(`Invalid ${type} length.`);
    }

    if (['GTIN', 'EAN', 'UPC'].includes(type) && !BarcodeIdentifier.hasValidChecksum(value)) {
      throw new Error(`Invalid ${type} checksum.`);
    }

    return new BarcodeIdentifier(type, value);
  }

  private static hasValidChecksum(value: string): boolean {
    const digits = value.split('').map(Number);
    const checkDigit = digits.pop();
    if (checkDigit === undefined) return false;

    const sum = digits.reduce((total, digit, index) => {
      const weight = (digits.length - index) % 2 === 1 ? 3 : 1;
      return total + digit * weight;
    }, 0);
    return (10 - (sum % 10)) % 10 === checkDigit;
  }
}
