import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { IP_BLOCK_PORT } from '../../application/ports/ip-block.port';
import { DatabaseModule } from '../persistence/database.module';
import { BlockedIpOrmEntity } from '../persistence/blocked-ip.orm-entity';
import { RedisModule } from '../redis/redis.module';
import { AdminBlockedIpsController } from '../../presentation/http/admin-blocked-ips.controller';
import { IpBlockMiddleware } from './ip-block.middleware';
import { IpBlockService } from './ip-block.service';

@Global()
@Module({
  imports: [DatabaseModule, RedisModule, MikroOrmModule.forFeature([BlockedIpOrmEntity])],
  controllers: [AdminBlockedIpsController],
  providers: [
    IpBlockService,
    IpBlockMiddleware,
    { provide: IP_BLOCK_PORT, useExisting: IpBlockService },
  ],
  exports: [IP_BLOCK_PORT, IpBlockService, IpBlockMiddleware],
})
export class IpBlockModule {}
