import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { PasswordPolicyViolationError } from '../../../domain/value-objects/password-policy.value-object';
import { UserDomainError } from '../../../domain/errors/user.errors';
import {
  AccountDisabledError,
  AccountLockedError,
  ForbiddenPermissionError,
  ForbiddenRoleError,
  IdentityError,
  InvalidCredentialsError,
  InvalidMfaChallengeError,
  InvalidMfaCodeError,
  InvalidPasswordResetTokenError,
  InvalidRefreshTokenError,
  RateLimitExceededError,
  TokenReuseDetectedError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from '../../../application/errors/identity.errors';

@Catch(IdentityError, UserDomainError, PasswordPolicyViolationError)
export class IdentityExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ url?: string }>();
    const mapped = this.mapException(exception);

    response.status(mapped.status).type('application/problem+json').json({
      type: `https://httpstatuses.com/${mapped.status}`,
      title: HttpStatus[mapped.status] ?? 'Error',
      status: mapped.status,
      detail: mapped.detail,
      instance: request.url ?? '',
      ...(mapped.code ? { errorCode: mapped.code } : {}),
    });
  }

  private mapException(exception: unknown): {
    status: number;
    detail: string;
    code?: string;
  } {
    if (exception instanceof PasswordPolicyViolationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        detail: exception.message,
        code: 'PASSWORD_POLICY_VIOLATION',
      };
    }

    if (exception instanceof UserAlreadyExistsError) {
      return {
        status: HttpStatus.CONFLICT,
        detail: exception.message,
        code: exception.code,
      };
    }

    if (exception instanceof InvalidCredentialsError) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        detail: exception.message,
        code: exception.code,
      };
    }

    if (exception instanceof InvalidMfaCodeError || exception instanceof InvalidMfaChallengeError) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        detail: exception.message,
        code: exception.code,
      };
    }

    if (exception instanceof AccountLockedError) {
      return {
        status: HttpStatus.LOCKED,
        detail: exception.message,
        code: exception.code,
      };
    }

    if (
      exception instanceof AccountDisabledError ||
      exception instanceof ForbiddenPermissionError
    ) {
      const err = exception as IdentityError;
      return {
        status: HttpStatus.FORBIDDEN,
        detail: err.message,
        code: err.code,
      };
    }

    if (exception instanceof ForbiddenRoleError) {
      return {
        status: HttpStatus.FORBIDDEN,
        detail: exception.message,
        code: exception.code,
      };
    }

    if (
      exception instanceof InvalidRefreshTokenError ||
      exception instanceof TokenReuseDetectedError ||
      exception instanceof InvalidPasswordResetTokenError
    ) {
      const err = exception as IdentityError;
      return {
        status: HttpStatus.UNAUTHORIZED,
        detail: err.message,
        code: err.code,
      };
    }

    if (exception instanceof RateLimitExceededError) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        detail: exception.message,
        code: exception.code,
      };
    }

    if (exception instanceof UserNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        detail: exception.message,
        code: exception.code,
      };
    }

    if (exception instanceof UserDomainError) {
      return { status: HttpStatus.BAD_REQUEST, detail: exception.message };
    }

    if (exception instanceof IdentityError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        detail: exception.message,
        code: exception.code,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'Unexpected identity error.',
    };
  }
}
