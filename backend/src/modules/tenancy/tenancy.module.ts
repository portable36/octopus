import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MEMBERSHIP_DIRECTORY } from '../../shared-kernel/application/ports/membership-directory.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { ResolveScopeHandler } from './application/commands/resolve-scope.handler';
import { MembershipDirectoryAdapter } from './infrastructure/persistence/membership-directory.adapter';
import { TenantIsolationSampleOrmEntity } from './infrastructure/persistence/tenant-isolation-sample.orm-entity';
import { UserMembershipOrmEntity } from './infrastructure/persistence/user-membership.orm-entity';
import { TenancyController } from './presentation/http/tenancy.controller';
import { TenantScopeInterceptor } from './presentation/http/tenant-scope.interceptor';

@Global()
@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([UserMembershipOrmEntity, TenantIsolationSampleOrmEntity]),
  ],
  controllers: [TenancyController],
  providers: [
    ResolveScopeHandler,
    {
      provide: MEMBERSHIP_DIRECTORY,
      useClass: MembershipDirectoryAdapter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantScopeInterceptor,
    },
  ],
  exports: [ResolveScopeHandler, MEMBERSHIP_DIRECTORY],
})
export class TenancyModule {}
