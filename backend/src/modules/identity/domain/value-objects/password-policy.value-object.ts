export class PasswordPolicyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordPolicyViolationError';
  }
}

export class PasswordPolicy {
  public static readonly MIN_LENGTH = 12;

  public static validate(plainPassword: string): void {
    if (plainPassword.length < PasswordPolicy.MIN_LENGTH) {
      throw new PasswordPolicyViolationError(
        `Password must be at least ${PasswordPolicy.MIN_LENGTH} characters.`,
      );
    }

    if (!/[a-z]/.test(plainPassword)) {
      throw new PasswordPolicyViolationError('Password must include a lowercase letter.');
    }

    if (!/[A-Z]/.test(plainPassword)) {
      throw new PasswordPolicyViolationError('Password must include an uppercase letter.');
    }

    if (!/[0-9]/.test(plainPassword)) {
      throw new PasswordPolicyViolationError('Password must include a digit.');
    }

    if (!/[^A-Za-z0-9]/.test(plainPassword)) {
      throw new PasswordPolicyViolationError('Password must include a special character.');
    }
  }
}
