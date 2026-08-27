import {
  Body,
  Controller,
  Get,
  INestApplication,
  Module,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { IsEmail, IsString, MinLength } from 'class-validator';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../shared-kernel/presentation/http/current-user.decorator';
import { Public } from '../../shared-kernel/presentation/http/public.decorator';
import { RequirePermissions } from '../../shared-kernel/presentation/http/require-permissions.decorator';
import { Rfc7807ExceptionFilter } from '../../shared-kernel/infrastructure/filters/rfc7807-exception.filter';
import { AuthorizationService } from '../../modules/identity/application/services/authorization.service';
import {
  TOKEN_SIGNER,
  type TokenSigner,
} from '../../modules/identity/application/ports/token-signer.interface';
import { JwtAuthGuard } from '../../modules/identity/presentation/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../modules/identity/presentation/http/guards/permissions.guard';

class EchoDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  name!: string;
}

@Controller('probe')
class ProbeController {
  @Public()
  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('me')
  me(@CurrentUser() user: RequestPrincipal): RequestPrincipal {
    return user;
  }

  @Get('platform')
  @RequirePermissions('platform.users.read')
  platform(): { ok: true } {
    return { ok: true };
  }

  @Public()
  @Post('echo')
  echo(@Body() body: EchoDto): EchoDto {
    return body;
  }
}

/**
 * APP_GUARD + useFactory avoids Vitest/esbuild missing design:paramtypes
 * (Nest would otherwise `new Guard()` with no deps).
 */
@Module({
  controllers: [ProbeController],
  providers: [
    Reflector,
    AuthorizationService,
    {
      provide: TOKEN_SIGNER,
      useValue: {
        signAccess: async () => {
          throw new Error('signAccess not used in API contract tests');
        },
        verifyAccess: async () => {
          throw new Error('TOKEN_SIGNER stub — override in createApiTestApp');
        },
      } satisfies TokenSigner,
    },
    {
      provide: APP_GUARD,
      useFactory: (signer: TokenSigner, reflector: Reflector) =>
        new JwtAuthGuard(signer, reflector),
      inject: [TOKEN_SIGNER, Reflector],
    },
    {
      provide: APP_GUARD,
      useFactory: (authorization: AuthorizationService, reflector: Reflector) =>
        new PermissionsGuard(authorization, reflector),
      inject: [AuthorizationService, Reflector],
    },
  ],
})
class ApiContractTestModule {}

export type ApiTestTokenSigner = Pick<TokenSigner, 'verifyAccess'>;

export async function createApiTestApp(tokenSigner: ApiTestTokenSigner): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [ApiContractTestModule],
  })
    .overrideProvider(TOKEN_SIGNER)
    .useValue(tokenSigner)
    .compile();

  const app = moduleRef.createNestApplication({ bodyParser: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new Rfc7807ExceptionFilter());
  await app.init();
  return app;
}
