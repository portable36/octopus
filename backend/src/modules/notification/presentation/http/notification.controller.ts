import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { NotificationHandlers } from '../../application/commands/notification.handlers';

class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  marketingEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingInApp?: boolean;
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
