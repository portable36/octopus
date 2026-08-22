import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AppConfigService } from '../../config/app-config.service';
import { USER_ROLE_ASSIGNER } from '../../shared-kernel/application/ports/user-role-assigner.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { RegisterUserHandler } from './application/commands/register-user.handler';
import { LoginUserHandler } from './application/commands/login-user.handler';
import { LogoutUserHandler, RefreshSessionHandler } from './application/commands/session.handlers';
import {
  ChangePasswordHandler,
  RequestPasswordResetHandler,
  ResetPasswordHandler,
} from './application/commands/change-password.handler';
import { PASSWORD_HASHER } from './application/ports/password-hasher.interface';
import { TOKEN_SIGNER } from './application/ports/token-signer.interface';
import { USER_REPOSITORY } from './application/ports/user-repository.interface';
import { REFRESH_TOKEN_STORE } from './application/ports/refresh-token-store.interface';
import { LOGIN_RATE_LIMITER } from './application/ports/login-rate-limiter.interface';
import { PASSWORD_RESET_STORE } from './application/ports/password-reset-store.interface';
import { AuthorizationService } from './application/services/authorization.service';
import { AuthSessionService } from './application/services/auth-session.service';
import { Argon2PasswordHasherAdapter } from './infrastructure/crypto/argon2-password-hasher.adapter';
import { UserRepositoryAdapter } from './infrastructure/persistence/user.repository.adapter';
import { UserOrmEntity } from './infrastructure/persistence/user.orm-entity';
import { RedisRefreshTokenStoreAdapter } from './infrastructure/redis/redis-refresh-token-store.adapter';
import { RedisLoginRateLimiterAdapter } from './infrastructure/redis/redis-login-rate-limiter.adapter';
import { RedisPasswordResetStoreAdapter } from './infrastructure/redis/redis-password-reset-store.adapter';
import { JwtTokenSignerAdapter } from './infrastructure/tokens/jwt-token-signer.adapter';
import { UserRoleAssignerAdapter } from './infrastructure/persistence/user-role-assigner.adapter';
import { AuthController } from './presentation/http/auth.controller';
import { JwtAuthGuard } from './presentation/http/guards/jwt-auth.guard';
import { PermissionsGuard } from './presentation/http/guards/permissions.guard';

@Global()
@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([UserOrmEntity]),
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret,
        signOptions: {
          expiresIn: config.jwtExpiresIn,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegisterUserHandler,
    LoginUserHandler,
    LogoutUserHandler,
    RefreshSessionHandler,
    ChangePasswordHandler,
    RequestPasswordResetHandler,
    ResetPasswordHandler,
    AuthorizationService,
    AuthSessionService,
    JwtAuthGuard,
    PermissionsGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryAdapter,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: Argon2PasswordHasherAdapter,
    },
    {
      provide: TOKEN_SIGNER,
      useClass: JwtTokenSignerAdapter,
    },
    {
      provide: REFRESH_TOKEN_STORE,
      useClass: RedisRefreshTokenStoreAdapter,
    },
    {
      provide: LOGIN_RATE_LIMITER,
      useClass: RedisLoginRateLimiterAdapter,
    },
    {
      provide: PASSWORD_RESET_STORE,
      useClass: RedisPasswordResetStoreAdapter,
    },
    {
      provide: USER_ROLE_ASSIGNER,
      useClass: UserRoleAssignerAdapter,
    },
  ],
  exports: [
    AuthorizationService,
    JwtAuthGuard,
    PermissionsGuard,
    TOKEN_SIGNER,
    USER_REPOSITORY,
    USER_ROLE_ASSIGNER,
  ],
})
export class IdentityModule {}
