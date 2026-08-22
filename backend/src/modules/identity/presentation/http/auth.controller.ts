import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppConfigService } from '../../../../config/app-config.service';
import { ChangePasswordHandler } from '../../application/commands/change-password.handler';
import { LoginUserHandler } from '../../application/commands/login-user.handler';
import { RegisterUserHandler } from '../../application/commands/register-user.handler';
import {
  LogoutUserHandler,
  RefreshSessionHandler,
} from '../../application/commands/session.handlers';
import {
  RequestPasswordResetHandler,
  ResetPasswordHandler,
} from '../../application/commands/change-password.handler';
import { InvalidRefreshTokenError } from '../../application/errors/identity.errors';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import {
  AuthSessionResponseDto,
  ChangePasswordRequestDto,
  ForgotPasswordRequestDto,
  LoginRequestDto,
  MeResponseDto,
  RegisterRequestDto,
  ResetPasswordRequestDto,
} from './dto/auth.dto';
import { IdentityExceptionFilter } from './filters/identity-exception.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import type { AuthPrincipal } from '../../application/dto/auth-session.dto';

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
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  async register(
    @Body() body: RegisterRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponseDto> {
    const session = await this.registerUser.execute(body);
    this.setRefreshCookie(res, session.refreshToken);
    return this.toSessionResponse(session);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate with email and password' })
  async login(
    @Body() body: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponseDto> {
    const rateLimitKey = `${req.ip ?? 'unknown'}:${body.email.toLowerCase()}`;
    const session = await this.loginUser.execute({
      email: body.email,
      password: body.password,
      rateLimitKey,
    });
    this.setRefreshCookie(res, session.refreshToken);
    return this.toSessionResponse(session);
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
    return user;
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
  async forgotPassword(@Body() body: ForgotPasswordRequestDto): Promise<void> {
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
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
