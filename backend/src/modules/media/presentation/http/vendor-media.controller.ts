import { Body, Controller, Inject, Param, Post, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';
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
import { MediaAuthorizationService } from '../../application/services/media-authorization.service';
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

class RegisterVendorMediaDto {
  @IsString()
  originalFilename!: string;

  @IsString()
  contentType!: string;

  @IsInt()
  @Min(1)
  byteSize!: number;

  @IsString()
  storageKey!: string;

  @IsString()
  contentPrefixBase64!: string;
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
    createdAt: asset.createdAt.toISOString(),
  };
}

@ApiTags('vendor-media')
@Controller('vendors/:vendorId/media')
@ApiBearerAuth()
@UseFilters(MediaExceptionFilter)
export class VendorMediaController {
  constructor(
    private readonly media: MediaHandlers,
    private readonly authz: MediaAuthorizationService,
    @Inject(API_RATE_LIMITER) private readonly rateLimiter: ApiRateLimiter,
  ) {}

  @Post('upload-sessions')
  @RequirePermissions('media.write')
  @ApiOperation({ summary: 'Create a presigned direct-to-storage upload session for a vendor' })
  async createUploadSession(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Body() body: CreateUploadSessionDto,
  ) {
    await this.rateLimiter.consume(`media:upload-session:${user.userId}`, 30, 60);
    const vendor = await this.authz.requireActiveVendor(vendorId);
    this.authz.assertCanMutate(vendor, user.userId, user.roles);
    return this.media.createUploadSession({
      vendorId,
      originalFilename: body.originalFilename,
      contentType: body.contentType,
      byteSize: body.byteSize,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
  }

  @Post()
  @RequirePermissions('media.write')
  @ApiOperation({ summary: 'Register vendor media metadata after direct upload' })
  async register(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Body() body: RegisterVendorMediaDto,
  ) {
    await this.rateLimiter.consume(`media:register:${user.userId}`, 30, 60);
    const vendor = await this.authz.requireActiveVendor(vendorId);
    this.authz.assertCanMutate(vendor, user.userId, user.roles);
    const asset = await this.media.registerMetadata({
      ...body,
      actorUserId: user.userId,
      actorRoles: user.roles,
      vendorId,
      storeId: null,
    });
    return toMediaAssetResponse(asset);
  }
}
