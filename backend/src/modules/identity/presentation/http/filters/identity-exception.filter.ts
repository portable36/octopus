import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordPolicyViolationError } from '../../../domain/value-objects/password-policy.value-object';
import { UserDomainError } from '../../../domain/errors/user.errors';
import {
  AccountDisabledError,
  AccountLockedError,
  ForbiddenPermissionError,
  ForbiddenRoleError,
  IdentityError,
  InvalidCredentialsError,
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
    const response = ctx.getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();

    const mapped = this.mapException(exception);
    response.status(mapped.getStatus()).json(mapped.getResponse());
  }

  private mapException(exception: unknown): HttpException {
    if (exception instanceof PasswordPolicyViolationError) {
      return new HttpException(
        { message: exception.message, code: 'PASSWORD_POLICY_VIOLATION' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (exception instanceof UserAlreadyExistsError) {
      return new ConflictException({ message: exception.message, code: exception.code });
    }

    if (exception instanceof InvalidCredentialsError) {
      return new UnauthorizedException({ message: exception.message, code: exception.code });
    }

    if (exception instanceof AccountLockedError) {
      return new HttpException(
        { message: exception.message, code: exception.code },
        HttpStatus.LOCKED,
      );
    }

    if (
      exception instanceof AccountDisabledError ||
      exception instanceof ForbiddenPermissionError
    ) {
      return new ForbiddenException({
        message: (exception as IdentityError).message,
        code: (exception as IdentityError).code,
      });
    }

    if (exception instanceof ForbiddenRoleError) {
      return new ForbiddenException({ message: exception.message, code: exception.code });
    }

    if (
      exception instanceof InvalidRefreshTokenError ||
      exception instanceof TokenReuseDetectedError ||
      exception instanceof InvalidPasswordResetTokenError
    ) {
      return new UnauthorizedException({
        message: (exception as IdentityError).message,
        code: (exception as IdentityError).code,
      });
    }

    if (exception instanceof RateLimitExceededError) {
      return new HttpException(
        {
          message: exception.message,
          code: exception.code,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (exception instanceof UserNotFoundError) {
      return new HttpException(
        { message: exception.message, code: exception.code },
        HttpStatus.NOT_FOUND,
      );
    }

    if (exception instanceof UserDomainError) {
      return new HttpException({ message: exception.message }, HttpStatus.BAD_REQUEST);
    }

    if (exception instanceof IdentityError) {
      return new HttpException(
        { message: exception.message, code: exception.code },
        HttpStatus.BAD_REQUEST,
      );
    }

    return new HttpException('Unexpected identity error.', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
