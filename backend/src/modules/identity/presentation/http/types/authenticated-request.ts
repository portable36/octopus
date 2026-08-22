import type { Request } from 'express';
import type { AuthPrincipal } from '../../../application/dto/auth-session.dto';

export interface AuthenticatedRequest extends Request {
  user: AuthPrincipal;
}
