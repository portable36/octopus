import { randomFillSync } from 'node:crypto';
import { ValueObject } from './value-object';

const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generateUuidV7(): string {
  const bytes = randomFillSync(new Uint8Array(16));
  const timestamp = Date.now();

  bytes[0] = Number((timestamp / 2 ** 40) & 0xff);
  bytes[1] = Number((timestamp / 2 ** 32) & 0xff);
  bytes[2] = Number((timestamp / 2 ** 24) & 0xff);
  bytes[3] = Number((timestamp / 2 ** 16) & 0xff);
  bytes[4] = Number((timestamp / 2 ** 8) & 0xff);
  bytes[5] = Number(timestamp & 0xff);

  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export class UniqueID extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  public static create(): UniqueID {
    return new UniqueID({ value: generateUuidV7() });
  }

  public static from(value: string): UniqueID {
    if (!UUID_V7_REGEX.test(value)) {
      throw new Error(`Invalid UUIDv7: ${value}`);
    }
    return new UniqueID({ value });
  }

  get value(): string {
    return this.props.value;
  }

  override toString(): string {
    return this.props.value;
  }
}
