import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { NotificationHandlers } from '../../application/commands/notification.handlers';
import type { PushPlatform } from '../../domain/notification.types';

class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  marketingEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingInApp?: boolean;
}

class RegisterPushDeviceDto {
  @IsIn(['web', 'android', 'ios'])
  platform!: PushPlatform;

  @IsString()
  @MinLength(8)
  @MaxLength(4096)
  token!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  label?: string;
}

@ApiTags('notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notifications: NotificationHandlers) {}

  @Get()
  @ApiOperation({ summary: 'List in-app notifications for the current user' })
  async list(
    @CurrentUser() user: RequestPrincipal,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    const result = await this.notifications.listForUser(user.userId, limit);
    return {
      unreadCount: result.unreadCount,
      items: result.items.map((n) => ({
        id: n.id,
        type: n.notificationType,
        title: n.title,
        body: n.body,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  }

  @Get('preferences')
  @ApiOperation({
    summary: 'Get marketing notification preferences (transactional/security always on)',
  })
  async getPreferences(@CurrentUser() user: RequestPrincipal) {
    const prefs = await this.notifications.getPreferences(user.userId);
    return {
      marketingEmail: prefs.marketingEmail,
      marketingInApp: prefs.marketingInApp,
    };
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update marketing notification preferences' })
  async updatePreferences(
    @CurrentUser() user: RequestPrincipal,
    @Body() body: UpdateNotificationPreferencesDto,
  ) {
    const prefs = await this.notifications.updatePreferences(user.userId, {
      ...(body.marketingEmail !== undefined ? { marketingEmail: body.marketingEmail } : {}),
      ...(body.marketingInApp !== undefined ? { marketingInApp: body.marketingInApp } : {}),
    });
    return {
      marketingEmail: prefs.marketingEmail,
      marketingInApp: prefs.marketingInApp,
    };
  }

  @Post('devices')
  @ApiOperation({ summary: 'Register or refresh a push device token (upsert by fingerprint)' })
  async registerDevice(@CurrentUser() user: RequestPrincipal, @Body() body: RegisterPushDeviceDto) {
    const device = await this.notifications.registerPushDevice({
      userId: user.userId,
      platform: body.platform,
      token: body.token,
      label: body.label ?? null,
    });
    return {
      id: device.id,
      platform: device.platform,
      label: device.label,
      lastSeenAt: device.lastSeenAt.toISOString(),
      createdAt: device.createdAt.toISOString(),
    };
  }

  @Get('devices')
  @ApiOperation({ summary: 'List active push devices for the current user (no raw tokens)' })
  async listDevices(@CurrentUser() user: RequestPrincipal) {
    const devices = await this.notifications.listPushDevices(user.userId);
    return {
      items: devices.map((device) => ({
        id: device.id,
        platform: device.platform,
        label: device.label,
        lastSeenAt: device.lastSeenAt.toISOString(),
        createdAt: device.createdAt.toISOString(),
      })),
    };
  }

  @Delete('devices/:deviceId')
  @ApiOperation({ summary: 'Revoke a push device for the current user' })
  async revokeDevice(@CurrentUser() user: RequestPrincipal, @Param('deviceId') deviceId: string) {
    return this.notifications.revokePushDevice(user.userId, deviceId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark an in-app notification as read' })
  async markRead(@CurrentUser() user: RequestPrincipal, @Param('id') id: string) {
    const n = await this.notifications.markRead(user.userId, id);
    return {
      id: n.id,
      readAt: n.readAt?.toISOString() ?? null,
    };
  }
}
