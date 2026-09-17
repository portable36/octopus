import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
import { NotificationHandlers } from '../../application/commands/notification.handlers';
import type { DeliveryStatus, NotificationChannel } from '../../domain/notification.types';

const CHANNELS = new Set<NotificationChannel>(['EMAIL', 'IN_APP', 'SMS', 'PUSH']);
const STATUSES = new Set<DeliveryStatus>(['PENDING', 'SENT', 'FAILED', 'SKIPPED']);

function maskEmail(email: string | null): string | null {
  if (!email) {
    return null;
  }
  const at = email.indexOf('@');
  if (at <= 0) {
    return '***';
  }
  return `${email.slice(0, 1)}***@${email.slice(at + 1)}`;
}

function parseChannel(raw?: string): NotificationChannel | undefined {
  if (!raw || !CHANNELS.has(raw as NotificationChannel)) {
    return undefined;
  }
  return raw as NotificationChannel;
}

function parseStatus(raw?: string): DeliveryStatus | undefined {
  if (!raw || !STATUSES.has(raw as DeliveryStatus)) {
    return undefined;
  }
  return raw as DeliveryStatus;
}

@ApiTags('admin-notifications')
@Controller('admin/notifications')
@ApiBearerAuth()
@RequirePermissions('settings.read')
export class AdminNotificationController {
  constructor(private readonly notifications: NotificationHandlers) {}

  @Get('templates')
  @ApiOperation({ summary: 'List notification templates (platform admin, read-only)' })
  async listTemplates() {
    const items = await this.notifications.listTemplatesForAdmin();
    return {
      items: items.map((t) => ({
        id: t.id,
        templateKey: t.templateKey,
        channel: t.channel,
        locale: t.locale,
        version: t.version,
        subject: t.subject,
      })),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List recent notification deliveries (platform admin, read-only)' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'deliveryStatus', required: false })
  @ApiQuery({ name: 'templateKey', required: false })
  async listRecent(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('channel') channel?: string,
    @Query('deliveryStatus') deliveryStatus?: string,
    @Query('templateKey') templateKey?: string,
  ) {
    const parsedChannel = parseChannel(channel);
    const parsedStatus = parseStatus(deliveryStatus);
    const key = templateKey?.trim();
    const items = await this.notifications.listRecentForAdmin({
      limit,
      ...(parsedChannel !== undefined ? { channel: parsedChannel } : {}),
      ...(parsedStatus !== undefined ? { deliveryStatus: parsedStatus } : {}),
      ...(key ? { templateKey: key } : {}),
    });
    return {
      items: items.map((n) => ({
        id: n.id,
        eventId: n.eventId,
        recipientUserId: n.recipientUserId,
        recipientEmailMasked: maskEmail(n.recipientEmail),
        notificationType: n.notificationType,
        channel: n.channel,
        locale: n.locale,
        templateKey: n.templateKey,
        templateVersion: n.templateVersion,
        title: n.title,
        deliveryStatus: n.deliveryStatus,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  }

  @Get(':id/attempts')
  @ApiOperation({ summary: 'List delivery attempts for a notification (platform admin)' })
  async listAttempts(@Param('id') id: string) {
    const items = await this.notifications.listDeliveryAttemptsForAdmin(id);
    return {
      items: items.map((a) => ({
        id: a.id,
        notificationId: a.notificationId,
        channel: a.channel,
        attemptNumber: a.attemptNumber,
        status: a.status,
        providerMessageId: a.providerMessageId,
        errorCode: a.errorCode,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }
}
