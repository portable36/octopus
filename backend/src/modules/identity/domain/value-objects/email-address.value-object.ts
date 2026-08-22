import { ValueObject } from '../../../../shared-kernel/domain/value-object';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailAddress extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  public static create(value: string): EmailAddress {
    const normalized = value.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      throw new Error(`Invalid email address: ${value}`);
    }
    return new EmailAddress({ value: normalized });
  }

  get value(): string {
    return this.props.value;
  }

  override toString(): string {
    return this.props.value;
  }
}
