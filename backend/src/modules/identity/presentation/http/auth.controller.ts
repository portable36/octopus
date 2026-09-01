import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppConfigService } from '../../../../config/app-config.service';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
import {
  ChangePasswordHandler,
  RequestPasswordResetHandler,
  ResetPasswordHandler,
} from '../../application/commands/change-password.handler';
import { LoginUserHandler } from '../../application/commands/login-user.handler';
import { MfaHandlers } from '../../application/commands/mfa.handlers';
import { RegisterUserHandler } from '../../application/commands/register-user.handler';
import {
  LogoutUserHandler,
  RefreshSessionHandler,
} from '../../application/commands/session.handlers';
import type { AuthPrincipal } from '../../application/dto/auth-session.dto';
import { InvalidRefreshTokenError } from '../../application/errors/identity.errors';
import {
  LOGIN_RATE_LIMITER,
  type LoginRateLimiter,
} from '../../application/ports/login-rate-limiter.interface';
import { AuthorizationService } from '../../application/services/authorization.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import {
  AuthSessionResponseDto,
  ChangePasswordRequestDto,
  ForgotPasswordRequestDto,
  LoginRequestDto,
  MeResponseDto,
  MfaCodeRequestDto,
  MfaDisableRequestDto,
  MfaRequiredResponseDto,
  MfaSetupResponseDto,
  MfaVerifyLoginRequestDto,
  RegisterRequestDto,
  ResetPasswordRequestDto,
} from './dto/auth.dto';
import { IdentityExceptionFilter } from './filters/identity-exception.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
@UseFilters(IdentityExceptionFilter)
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserHandler,
    private readonly loginUser: LoginUserHandler,
    private readonly logoutUser: LogoutUserHandler,
    private readonly refreshSession: RefreshSessionHandler,
    private readonly changePassword: ChangePasswordHandler,
    private readonly requestPasswordReset: RequestPasswordResetHandler,
    private readonly resetPassword: ResetPasswordHandler,
    private readonly mfa: MfaHandlers,
    private readonly authorization: AuthorizationService,
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Inject(LOGIN_RATE_LIMITER) private readonly rateLimiter: LoginRateLimiter,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  async register(
    @Body() body: RegisterRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponseDto> {
    const rateKey = `register:${req.ip ?? 'unknown'}`;
    await this.rateLimiter.assertAllowed(rateKey);
    await this.rateLimiter.recordFailure(rateKey);
    const session = await this.registerUser.execute(body);
    this.setRefreshCookie(res, session.refreshToken);
    return this.toSessionResponse(session);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate with email and password (may require MFA)' })
  async login(
    @Body() body: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponseDto | MfaRequiredResponseDto> {
    const rateLimitKey = `${req.ip ?? 'unknown'}:${body.email.toLowerCase()}`;
    const result = await this.loginUser.execute({
      email: body.email,
      password: body.password,
      rateLimitKey,
    });
    if (result.kind === 'mfa_required') {
      return {
        mfaRequired: true,
        mfaToken: result.mfaToken,
        expiresInSeconds: result.expiresInSeconds,
      };
    }
    this.setRefreshCookie(res, result.session.refreshToken);
    return this.toSessionResponse(result.session);
  }

  @Public()
  @Post('mfa/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Complete login with TOTP after mfaRequired' })
  async verifyMfa(
    @Body() body: MfaVerifyLoginRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponseDto> {
    const session = await this.mfa.verifyLogin(body.mfaToken, body.code);
    this.setRefreshCookie(res, session.refreshToken);
    return this.toSessionResponse(session);
  }

  @Post('mfa/setup')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Begin TOTP MFA enrollment (returns otpauth URL + secret)' })
  async setupMfa(@CurrentUser() user: AuthPrincipal): Promise<MfaSetupResponseDto> {
    return this.mfa.beginSetup(user.userId);
  }

  @Post('mfa/enable')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm TOTP MFA enrollment with a valid code' })
  async enableMfa(
    @CurrentUser() user: AuthPrincipal,
    @Body() body: MfaCodeRequestDto,
  ): Promise<void> {
    await this.mfa.confirmEnable(user.userId, body.code);
  }

  @Post('mfa/disable')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA (requires password + current TOTP)' })
  async disableMfa(
    @CurrentUser() user: AuthPrincipal,
    @Body() body: MfaDisableRequestDto,
  ): Promise<void> {
    await this.mfa.disable(user.userId, body.password, body.code);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponseDto> {
    const refreshToken = req.cookies?.[this.config.refreshCookieName] as string | undefined;
    if (!refreshToken) {
      throw new InvalidRefreshTokenError();
    }

    const session = await this.refreshSession.execute(refreshToken);
    this.setRefreshCookie(res, session.refreshToken);
    return this.toSessionResponse(session);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke the current refresh token' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const refreshToken = req.cookies?.[this.config.refreshCookieName] as string | undefined;
    await this.logoutUser.execute(refreshToken);
    res.clearCookie(this.config.refreshCookieName, this.cookieOptions());
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the authenticated principal' })
  me(@CurrentUser() user: AuthPrincipal): MeResponseDto {
    return {
      ...user,
      permissions: this.authorization.listPermissions(user.roles),
    };
  }

  @Post('change-password')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for the authenticated user' })
  async changePasswordRoute(
    @CurrentUser() user: AuthPrincipal,
    @Body() body: ChangePasswordRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.changePassword.execute({
      userId: user.userId,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
    res.clearCookie(this.config.refreshCookieName, this.cookieOptions());
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Request a password reset token' })
  async forgotPassword(@Body() body: ForgotPasswordRequestDto, @Req() req: Request): Promise<void> {
    const rateKey = `forgot:${req.ip ?? 'unknown'}:${body.email.toLowerCase()}`;
    await this.rateLimiter.assertAllowed(rateKey);
    await this.rateLimiter.recordFailure(rateKey);
    await this.requestPasswordReset.execute(body);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Reset password using a reset token' })
  async resetPasswordRoute(@Body() body: ResetPasswordRequestDto): Promise<void> {
    await this.resetPassword.execute(body);
  }

  @Get('admin-check')
  @RequirePermissions('vendor.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Permission-protected probe endpoint' })
  adminCheck(@CurrentUser() user: AuthPrincipal): { ok: true; userId: string } {
    return { ok: true, userId: user.userId };
  }

  private toSessionResponse(session: {
    accessToken: string;
    expiresInSeconds: number;
    user: AuthPrincipal;
  }): AuthSessionResponseDto {
    return {
      accessToken: session.accessToken,
      expiresInSeconds: session.expiresInSeconds,
      user: session.user,
    };
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(this.config.refreshCookieName, refreshToken, this.cookieOptions());
  }

  private cookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax';
    path: string;
    maxAge: number;
  } {
    return {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: this.config.refreshTokenExpiresInMs,
    };
  }
}
