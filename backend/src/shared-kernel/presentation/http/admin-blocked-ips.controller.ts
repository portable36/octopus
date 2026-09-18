import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { RequirePermissions } from './require-permissions.decorator';
import { CurrentUser, type RequestPrincipal } from './current-user.decorator';
import { IP_BLOCK_PORT, type IpBlockPort } from '../../application/ports/ip-block.port';

class CreateBlockedIpDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  ipCidr!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

class UpdateBlockedIpDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  reason?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('admin-security')
@Controller('admin/security/blocked-ips')
@ApiBearerAuth()
@RequirePermissions('settings.read')
export class AdminBlockedIpsController {
  constructor(@Inject(IP_BLOCK_PORT) private readonly ipBlocks: IpBlockPort) {}

  @Get()
  @ApiOperation({ summary: 'List blocked IP / CIDR entries' })
  async list() {
    const items = await this.ipBlocks.list();
    return { items: items.map((row) => this.serialize(row)) };
  }

  @Post()
  @RequirePermissions('settings.write')
  @ApiOperation({ summary: 'Add an IP or CIDR to the denylist' })
  async create(@CurrentUser() user: RequestPrincipal, @Body() body: CreateBlockedIpDto) {
    const row = await this.ipBlocks.create({
      ipCidr: body.ipCidr,
      reason: body.reason ?? null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      createdBy: user.userId,
    });
    return this.serialize(row);
  }

  @Patch(':id')
  @RequirePermissions('settings.write')
  @ApiOperation({ summary: 'Update reason / expiry / active flag (IP immutable)' })
  async update(
    @CurrentUser() user: RequestPrincipal,
    @Param('id') id: string,
    @Body() body: UpdateBlockedIpDto,
  ) {
    const patch: {
      id: string;
      actorUserId: string;
      reason?: string | null;
      expiresAt?: Date | null;
      isActive?: boolean;
    } = { id, actorUserId: user.userId };
    if (body.reason !== undefined) {
      patch.reason = body.reason;
    }
    if (body.expiresAt !== undefined) {
      patch.expiresAt =
        body.expiresAt === null || body.expiresAt === '' ? null : new Date(body.expiresAt);
    }
    if (body.isActive !== undefined) {
      patch.isActive = body.isActive;
    }
    const row = await this.ipBlocks.update(patch);
    return this.serialize(row);
  }

  @Delete(':id')
  @RequirePermissions('settings.write')
  @ApiOperation({ summary: 'Hard-delete a blocked IP entry' })
  async remove(@CurrentUser() user: RequestPrincipal, @Param('id') id: string) {
    await this.ipBlocks.delete(id, user.userId);
    return { ok: true };
  }

  private serialize(row: {
    id: string;
    ipCidr: string;
    reason: string | null;
    expiresAt: Date | null;
    isActive: boolean;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      ipCidr: row.ipCidr,
      reason: row.reason,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      isActive: row.isActive,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
