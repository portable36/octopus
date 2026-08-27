import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface RequestPrincipal {
  readonly userId: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly mfaEnabled?: boolean;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestPrincipal => {
    const request = context.switchToHttp().getRequest<Request & { user: RequestPrincipal }>();
    return request.user;
  },
);
