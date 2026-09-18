import { Body, Controller, Get, Inject, Param, Post, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
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

class CreateMultipartSessionDto {
  @IsString()
  originalFilename!: string;

  @IsString()
  contentType!: string;

  @IsInt()
  @Min(1)
  byteSize!: number;
}

class MultipartPartUrlDto {
  @IsString()
  storageKey!: string;

  @IsString()
  uploadId!: string;

  @IsInt()
  @Min(1)
  partNumber!: number;
}

class MultipartPartEtagDto {
  @IsInt()
  @Min(1)
  partNumber!: number;

  @IsString()
  etag!: string;
}

class CompleteMultipartDto {
  @IsString()
  storageKey!: string;

  @IsString()
  uploadId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MultipartPartEtagDto)
  parts!: MultipartPartEtagDto[];
}

class AbortMultipartDto {
  @IsString()
  storageKey!: string;

  @IsString()
  uploadId!: string;
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
  @ApiOperation({ summary: 'Create a presigned single-object PUT upload session (≤10MB)' })
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

  @Post('multipart-sessions')
  @RequirePermissions('media.write')
  @ApiOperation({ summary: 'Initiate a resumable multipart upload session (≤100MB)' })
  async createMultipartSession(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Body() body: CreateMultipartSessionDto,
  ) {
    await this.rateLimiter.consume(`media:multipart-session:${user.userId}`, 20, 60);
    const vendor = await this.authz.requireActiveVendor(vendorId);
    this.authz.assertCanMutate(vendor, user.userId, user.roles);
    return this.media.createMultipartSession({
      vendorId,
      originalFilename: body.originalFilename,
      contentType: body.contentType,
      byteSize: body.byteSize,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
  }

  @Post('multipart-sessions/part-urls')
  @RequirePermissions('media.write')
  @ApiOperation({ summary: 'Presign a single multipart part PUT URL' })
  async createMultipartPartUrl(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Body() body: MultipartPartUrlDto,
  ) {
    await this.rateLimiter.consume(`media:multipart-part:${user.userId}`, 120, 60);
    const vendor = await this.authz.requireActiveVendor(vendorId);
    this.authz.assertCanMutate(vendor, user.userId, user.roles);
    return this.media.createMultipartPartUrl({
      vendorId,
      storageKey: body.storageKey,
      uploadId: body.uploadId,
      partNumber: body.partNumber,
      actorRoles: user.roles,
    });
  }

  @Get('multipart-sessions/parts')
  @RequirePermissions('media.write')
  @ApiOperation({ summary: 'List uploaded parts for resume' })
  async listMultipartParts(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Query('storageKey') storageKey: string,
    @Query('uploadId') uploadId: string,
  ) {
    await this.rateLimiter.consume(`media:multipart-list:${user.userId}`, 60, 60);
    const vendor = await this.authz.requireActiveVendor(vendorId);
    this.authz.assertCanMutate(vendor, user.userId, user.roles);
    return this.media.listMultipartParts({
      vendorId,
      storageKey,
      uploadId,
      actorRoles: user.roles,
    });
  }

  @Post('multipart-sessions/complete')
  @RequirePermissions('media.write')
  @ApiOperation({ summary: 'Complete a multipart upload (then call register)' })
  async completeMultipartSession(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Body() body: CompleteMultipartDto,
  ) {
    await this.rateLimiter.consume(`media:multipart-complete:${user.userId}`, 20, 60);
    const vendor = await this.authz.requireActiveVendor(vendorId);
    this.authz.assertCanMutate(vendor, user.userId, user.roles);
    return this.media.completeMultipartSession({
      vendorId,
      storageKey: body.storageKey,
      uploadId: body.uploadId,
      parts: body.parts,
      actorRoles: user.roles,
    });
  }

  @Post('multipart-sessions/abort')
  @RequirePermissions('media.write')
  @ApiOperation({ summary: 'Abort an incomplete multipart upload' })
  async abortMultipartSession(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Body() body: AbortMultipartDto,
  ) {
    await this.rateLimiter.consume(`media:multipart-abort:${user.userId}`, 20, 60);
    const vendor = await this.authz.requireActiveVendor(vendorId);
    this.authz.assertCanMutate(vendor, user.userId, user.roles);
    return this.media.abortMultipartSession({
      vendorId,
      storageKey: body.storageKey,
      uploadId: body.uploadId,
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
