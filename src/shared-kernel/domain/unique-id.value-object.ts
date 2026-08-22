import { randomUUID } from 'crypto';

export class UniqueId {
  private readonly value: string;

  private constructor(value?: string) {
    this.value = value ?? randomUUID(); // Production can upgrade this to UUIDv7
  }

  public static create(): UniqueId {
    return new UniqueId();
  }

  public static fromString(id: string): UniqueId {
    if (!id || id.trim() === '') {
      throw new Error('Unique ID cannot be empty');
    }
    return new UniqueId(id);
  }

  public toString(): string {
    return this.value;
  }

  public equals(other: UniqueId): boolean {
    if (other === null || other === undefined) return false;
    return this.value === other.toString();
  }
}
