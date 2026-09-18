import { Body, Controller, Get, Inject, Param, Post, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
import {
  API_RATE_LIMITER,
  type ApiRateLimiter,
} from '../../../../shared-kernel/application/ports/api-rate-limiter.port';
import { MediaHandlers } from '../../application/commands/media.handlers';
import type { MediaAssetStatus } from '../../domain/media.types';
import { MediaExceptionFilter } from './filters/media-exception.filter';

class CreateUploadSessionDto {
  @IsString()
  originalFilename!: string;

  @IsString()
  contentType!: string;

  @IsInt()
  @Min(1)
  byteSize!: number;
}

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

class ListMediaQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsIn(['quarantined', 'ready', 'rejected', 'archived'])
  status?: MediaAssetStatus;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['platform', 'all'])
  scope?: 'platform' | 'all';

  @IsOptional()
  @IsString()
  includeArchived?: string;
}

function toMediaAssetResponse(asset: {
  id: string;
  originalFilename: string;
  contentType: string;
  byteSize: number;
  storageKey: string;
  uploadedBy: string;
  vendorId: string | null;
  storeId: string | null;
  status: string;
  rejectionReason: string | null;
  processedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: asset.id,
    originalFilename: asset.originalFilename,
    contentType: asset.contentType,
    byteSize: asset.byteSize,
    storageKey: asset.storageKey,
    uploadedBy: asset.uploadedBy,
    vendorId: asset.vendorId,
    storeId: asset.storeId,
    status: asset.status,
    rejectionReason: asset.rejectionReason,
    processedAt: asset.processedAt?.toISOString() ?? null,
    createdAt: asset.createdAt.toISOString(),
  };
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

  @Get('limits')
  @RequirePermissions('media.read')
  @ApiOperation({ summary: 'Upload limits and allowed content types for admin UI' })
  getLimits() {
    return this.media.getUploadLimits();
  }

  @Get()
  @RequirePermissions('media.read')
  @ApiOperation({ summary: 'List platform media assets (paginated)' })
  async list(@CurrentUser() user: RequestPrincipal, @Query() query: ListMediaQueryDto) {
    const result = await this.media.listMedia({
      actorRoles: user.roles,
      ...(query.limit != null ? { limit: query.limit } : {}),
      ...(query.cursor != null ? { cursor: query.cursor } : {}),
      ...(query.status != null ? { status: query.status } : {}),
      ...(query.contentType != null ? { contentType: query.contentType } : {}),
      ...(query.q != null ? { q: query.q } : {}),
      scope: query.scope ?? 'platform',
      includeArchived: query.includeArchived === '1' || query.includeArchived === 'true',
    });
    return {
      items: result.items.map(toMediaAssetResponse),
      nextCursor: result.nextCursor,
    };
  }

  @Post('upload-sessions')
  @RequirePermissions('media.write')
  @ApiOperation({ summary: 'Create a platform presigned PUT upload session (≤10MB)' })
  async createUploadSession(
    @CurrentUser() user: RequestPrincipal,
    @Body() body: CreateUploadSessionDto,
  ) {
    await this.rateLimiter.consume(`media:admin-upload-session:${user.userId}`, 30, 60);
    return this.media.createPlatformUploadSession({
      originalFilename: body.originalFilename,
      contentType: body.contentType,
      byteSize: body.byteSize,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
  }

  @Post()
  @RequirePermissions('media.write')
  @ApiOperation({
    summary: 'Register platform media asset metadata (MediaId source of truth; no public URL)',
  })
  async register(@CurrentUser() user: RequestPrincipal, @Body() body: RegisterMediaDto) {
    await this.rateLimiter.consume(`media:register:${user.userId}`, 30, 60);
    const asset = await this.media.registerMetadata({
      ...body,
      actorUserId: user.userId,
      actorRoles: user.roles,
      vendorId: null,
      storeId: null,
    });
    return toMediaAssetResponse(asset);
  }

  @Get(':mediaId')
  @RequirePermissions('media.read')
  @ApiOperation({ summary: 'Get media asset metadata + download URL by MediaId' })
  async getOne(@CurrentUser() user: RequestPrincipal, @Param('mediaId') mediaId: string) {
    const asset = await this.media.getById(mediaId, user.roles);
    const download = await this.media.resolveAuthorizedDownloadUrl(mediaId, user.roles);
    return {
      ...toMediaAssetResponse(asset),
      downloadUrl: download.url,
      downloadUrlExpiresAt: download.expiresAt,
    };
  }

  @Post(':mediaId/archive')
  @RequirePermissions('media.write')
  @ApiOperation({ summary: 'Soft-archive a media asset (hidden from default library list)' })
  async archive(@CurrentUser() user: RequestPrincipal, @Param('mediaId') mediaId: string) {
    await this.rateLimiter.consume(`media:archive:${user.userId}`, 30, 60);
    const asset = await this.media.archiveMedia({
      mediaId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return toMediaAssetResponse(asset);
  }
}
