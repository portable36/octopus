import { Controller, Get, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { ListUsersHandler } from '../../application/queries/list-users.handler';
import type { User } from '../../domain/aggregates/user.aggregate';
import { IdentityExceptionFilter } from './filters/identity-exception.filter';

function clampLimit(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n < 1) {
    return 50;
  }
  return Math.min(n, 200);
}

@ApiTags('admin-users')
@Controller('admin/users')
@ApiBearerAuth()
@UseFilters(IdentityExceptionFilter)
export class AdminUsersController {
  constructor(private readonly listUsers: ListUsersHandler) {}

  @Get()
  @ApiOperation({ summary: 'Platform admin: recent users (read; no credentials)' })
  @ApiQuery({ name: 'limit', required: false })
  async list(@CurrentUser() user: RequestPrincipal, @Query('limit') limit?: string) {
    const list = await this.listUsers.listRecentForPlatform({
      actorRoles: user.roles,
      limit: clampLimit(limit),
    });
    return list.map((row) => this.toResponse(row));
  }

  private toResponse(user: User) {
    return {
      id: user.id.value,
      email: user.email.value,
      name: user.name,
      status: user.status,
      roles: [...user.roles],
    };
  }
}
