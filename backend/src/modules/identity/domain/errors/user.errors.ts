export class UserDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserDomainError';
  }
}

export class InvalidUserStatusTransitionError extends UserDomainError {
  constructor(from: string, to: string) {
    super(`Invalid status transition: ${from} -> ${to}.`);
    this.name = 'InvalidUserStatusTransitionError';
  }
}

export class AccountNotActiveError extends UserDomainError {
  constructor() {
    super('Account is not active.');
    this.name = 'AccountNotActiveError';
  }
}

export class AccountLockedError extends UserDomainError {
  constructor() {
    super('Account is locked.');
    this.name = 'AccountLockedError';
  }
}

export class AccountDisabledError extends UserDomainError {
  constructor() {
    super('Account is disabled.');
    this.name = 'AccountDisabledError';
  }
}
