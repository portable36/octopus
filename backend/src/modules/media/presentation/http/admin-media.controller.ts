import { Body, Controller, Get, Inject, Param, Post, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { tryGetTenantContext } from '../../../../shared-kernel/infrastructure/context/tenant-context.storage';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
import {
  API_RATE_LIMITER,
  type ApiRateLimiter,
} from '../../../../shared-kernel/application/ports/api-rate-limiter.port';
import { MediaHandlers } from '../../application/commands/media.handlers';
import { MediaExceptionFilter } from './filters/media-exception.filter';

class RegisterMediaDto {
  @IsString()
  originalFilename!: string;

  @IsString()
  contentType!: string;

  @IsInt()
  @Min(1)
  byteSize!: number;

  @IsString()
  storageKey!: string;

  /** First ≥12 bytes of the uploaded object (base64) for magic-byte verification. */
  @IsString()
  contentPrefixBase64!: string;
}

@ApiTags('admin-media')
@Controller('admin/media')
@ApiBearerAuth()
@UseFilters(MediaExceptionFilter)
export class AdminMediaController {
  constructor(
    private readonly media: MediaHandlers,
    @Inject(API_RATE_LIMITER) private readonly rateLimiter: ApiRateLimiter,
  ) {}

  @Post()
  @RequirePermissions('media.write')
  @ApiOperation({
    summary: 'Register media asset metadata (MediaId source of truth; no public URL)',
  })
  async register(@CurrentUser() user: RequestPrincipal, @Body() body: RegisterMediaDto) {
    await this.rateLimiter.consume(`media:register:${user.userId}`, 30, 60);
    const ctx = tryGetTenantContext();
    const asset = await this.media.registerMetadata({
      ...body,
      actorUserId: user.userId,
      actorRoles: user.roles,
      vendorId: ctx?.vendorId ?? null,
      storeId: ctx?.storeId ?? null,
    });
    return {
      id: asset.id,
      originalFilename: asset.originalFilename,
      contentType: asset.contentType,
      byteSize: asset.byteSize,
      storageKey: asset.storageKey,
      uploadedBy: asset.uploadedBy,
      vendorId: asset.vendorId,
      storeId: asset.storeId,
      createdAt: asset.createdAt.toISOString(),
    };
  }

  @Get(':mediaId')
  @RequirePermissions('media.read')
  @ApiOperation({ summary: 'Get media asset metadata by MediaId' })
  async getOne(@CurrentUser() user: RequestPrincipal, @Param('mediaId') mediaId: string) {
    const asset = await this.media.getById(mediaId, user.roles);
    return {
      id: asset.id,
      originalFilename: asset.originalFilename,
      contentType: asset.contentType,
      byteSize: asset.byteSize,
      storageKey: asset.storageKey,
      uploadedBy: asset.uploadedBy,
      vendorId: asset.vendorId,
      storeId: asset.storeId,
      createdAt: asset.createdAt.toISOString(),
    };
  }
}
