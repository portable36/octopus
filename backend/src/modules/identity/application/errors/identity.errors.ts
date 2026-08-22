export class IdentityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'IdentityError';
  }
}

export class InvalidCredentialsError extends IdentityError {
  constructor() {
    super('Invalid email or password.', 'INVALID_CREDENTIALS');
  }
}

export class UserAlreadyExistsError extends IdentityError {
  constructor() {
    super('An account with this email already exists.', 'USER_ALREADY_EXISTS');
  }
}

export class AccountLockedError extends IdentityError {
  constructor() {
    super('Account is temporarily locked.', 'ACCOUNT_LOCKED');
  }
}

export class AccountDisabledError extends IdentityError {
  constructor() {
    super('Account is disabled.', 'ACCOUNT_DISABLED');
  }
}

export class InvalidRefreshTokenError extends IdentityError {
  constructor() {
    super('Refresh token is invalid or expired.', 'INVALID_REFRESH_TOKEN');
  }
}

export class TokenReuseDetectedError extends IdentityError {
  constructor() {
    super('Refresh token reuse detected. Session family revoked.', 'TOKEN_REUSE_DETECTED');
  }
}

export class RevokedTokenError extends IdentityError {
  constructor() {
    super('Token has been revoked.', 'REVOKED_TOKEN');
  }
}

export class ExpiredAccessTokenError extends IdentityError {
  constructor() {
    super('Access token has expired.', 'EXPIRED_ACCESS_TOKEN');
  }
}

export class RateLimitExceededError extends IdentityError {
  constructor() {
    super('Too many authentication attempts. Try again later.', 'RATE_LIMIT_EXCEEDED');
  }
}

export class ForbiddenPermissionError extends IdentityError {
  constructor() {
    super('Missing required permission.', 'MISSING_PERMISSION');
  }
}

export class ForbiddenRoleError extends IdentityError {
  constructor() {
    super('Insufficient role for this action.', 'INSUFFICIENT_ROLE');
  }
}

export class InvalidPasswordResetTokenError extends IdentityError {
  constructor() {
    super('Password reset token is invalid or expired.', 'INVALID_PASSWORD_RESET_TOKEN');
  }
}

export class UserNotFoundError extends IdentityError {
  constructor() {
    super('User not found.', 'USER_NOT_FOUND');
  }
}
