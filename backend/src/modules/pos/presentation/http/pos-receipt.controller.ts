import { Body, Controller, Get, HttpCode, Param, Post, Put, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { CreateReceiptHandler } from '../../application/commands/create-receipt.handler';
import { ReceiptTemplateHandler } from '../../application/commands/receipt-template.handler';
import type { ReceiptTemplate } from '../../domain/aggregates/receipt-template.aggregate';
import type { Receipt } from '../../domain/aggregates/receipt.aggregate';
import { CreateReceiptRequestDto, UpdateReceiptTemplateRequestDto } from './dto/receipt.dto';
import { PosExceptionFilter } from './filters/pos-exception.filter';

@ApiTags('pos-receipts')
@Controller('pos')
@ApiBearerAuth()
@UseFilters(PosExceptionFilter)
export class PosReceiptController {
  constructor(
    private readonly templates: ReceiptTemplateHandler,
    private readonly receipts: CreateReceiptHandler,
  ) {}

  @Get('stores/:storeId/receipt-template')
  @ApiOperation({ summary: 'Get or create the store receipt template' })
  async getTemplate(@CurrentUser() user: RequestPrincipal, @Param('storeId') storeId: string) {
    const template = await this.templates.getOrCreate(storeId, user.userId, user.roles);
    return this.templateResponse(template);
  }

  @Put('stores/:storeId/receipt-template')
  @ApiOperation({ summary: 'Update store receipt template (admin/manager)' })
  async updateTemplate(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: UpdateReceiptTemplateRequestDto,
  ) {
    const template = await this.templates.update(storeId, user.userId, user.roles, body);
    return this.templateResponse(template);
  }

  @Post('stores/:storeId/receipt-template/preview')
  @HttpCode(200)
  @ApiOperation({ summary: 'Preview receipt text with sample sale data' })
  async preview(@CurrentUser() user: RequestPrincipal, @Param('storeId') storeId: string) {
    return this.templates.preview(storeId, user.userId, user.roles);
  }

  @Post('stores/:storeId/receipts')
  @ApiOperation({ summary: 'Create an immutable receipt from a completed sale snapshot' })
  async createReceipt(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: CreateReceiptRequestDto,
  ) {
    const receipt = await this.receipts.fromSaleSnapshot({
      storeId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      saleId: body.saleId,
      soldAt: new Date(body.soldAt),
      cashierName: body.cashierName,
      ...(body.registerCode !== undefined ? { registerCode: body.registerCode } : {}),
      lines: body.lines,
      subtotalMinor: body.subtotalMinor,
      discountMinor: body.discountMinor,
      taxMinor: body.taxMinor,
      totalMinor: body.totalMinor,
      payments: body.payments,
      changeMinor: body.changeMinor,
      ...(body.currencyCode !== undefined ? { currencyCode: body.currencyCode } : {}),
    });
    return this.receiptResponse(receipt);
  }

  @Get('receipts/:receiptId')
  @ApiOperation({ summary: 'Get a receipt by id (frozen text + snapshot)' })
  async getReceipt(@CurrentUser() user: RequestPrincipal, @Param('receiptId') receiptId: string) {
    const receipt = await this.receipts.getById(receiptId, user.userId, user.roles);
    return this.receiptResponse(receipt);
  }

  @Post('receipts/:receiptId/printed')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark receipt print as successful (does not alter sale)' })
  async markPrinted(@CurrentUser() user: RequestPrincipal, @Param('receiptId') receiptId: string) {
    const receipt = await this.receipts.markPrinted(receiptId, user.userId, user.roles);
    return this.receiptResponse(receipt);
  }

  private templateResponse(template: ReceiptTemplate) {
    return {
      id: template.id.value,
      storeId: template.storeId,
      vendorId: template.vendorId,
      displayName: template.displayName,
      addressLines: template.addressLines,
      phone: template.phone,
      website: template.website,
      headerLines: template.headerLines,
      footerLines: template.footerLines,
      thankYouText: template.thankYouText,
      returnsPolicyText: template.returnsPolicyText,
      showSku: template.showSku,
      showTax: template.showTax,
      paperWidth: template.paperWidth,
      locale: template.locale,
      currencyCode: template.currencyCode,
      logoMediaId: template.logoMediaId,
      version: template.version,
      updatedAt: template.updatedAt.toISOString(),
      updatedBy: template.updatedBy,
    };
  }

  private receiptResponse(receipt: Receipt) {
    return {
      id: receipt.id.value,
      storeId: receipt.storeId,
      vendorId: receipt.vendorId,
      saleId: receipt.saleId,
      receiptNumber: receipt.receiptNumber,
      templateId: receipt.templateId,
      templateVersionUsed: receipt.templateVersionUsed,
      renderedText: receipt.renderedText,
      status: receipt.status,
      snapshot: {
        ...receipt.snapshot,
        soldAt: receipt.snapshot.soldAt.toISOString(),
      },
      createdAt: receipt.createdAt.toISOString(),
      createdBy: receipt.createdBy,
    };
  }
}
