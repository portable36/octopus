import { describe, expect, it } from 'vitest';
import { PasswordPolicy, PasswordPolicyViolationError } from './password-policy.value-object';

describe('PasswordPolicy', () => {
  it('accepts a strong password', () => {
    expect(() => PasswordPolicy.validate('Str0ng!Passw0rd')).not.toThrow();
  });

  it('rejects short passwords', () => {
    expect(() => PasswordPolicy.validate('Short1!')).toThrow(PasswordPolicyViolationError);
  });

  it('requires mixed character classes', () => {
    expect(() => PasswordPolicy.validate('alllowercase1!')).toThrow(PasswordPolicyViolationError);
    expect(() => PasswordPolicy.validate('ALLUPPERCASE1!')).toThrow(PasswordPolicyViolationError);
    expect(() => PasswordPolicy.validate('NoDigitsHere!')).toThrow(PasswordPolicyViolationError);
    expect(() => PasswordPolicy.validate('NoSpecialChars1')).toThrow(PasswordPolicyViolationError);
  });
});
