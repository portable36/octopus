import { ValueObject } from '../../../../shared-kernel/domain/value-object';

interface EmailAddressProps {
  value: string;
}

export class EmailAddress extends ValueObject<EmailAddressProps> {
  private static readonly EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(props: EmailAddressProps) {
    super(props);
  }

  public static create(value: string): EmailAddress {
    const normalized = value.trim().toLowerCase();
    if (!EmailAddress.EMAIL_PATTERN.test(normalized)) {
      throw new Error(`Invalid email address: ${value}`);
    }
    return new EmailAddress({ value: normalized });
  }

  public static from(value: string): EmailAddress {
    return new EmailAddress({ value: value.trim().toLowerCase() });
  }

  get value(): string {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }
}
