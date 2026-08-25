import { Injectable } from '@nestjs/common';
import type {
  LedgerPort,
  LedgerRefundAllocation,
  LedgerSaleRecognitionInput,
  VendorLedgerBalanceDto,
  VendorLedgerEntryDto,
} from '../../../../shared-kernel/application/ports/ledger.port';
import { LedgerCommandHandler } from '../../application/commands/ledger.handlers';

@Injectable()
export class LedgerPortAdapter implements LedgerPort {
  constructor(private readonly ledger: LedgerCommandHandler) {}

  public recordSaleRecognition(input: LedgerSaleRecognitionInput): Promise<void> {
    return this.ledger.recordSaleRecognition(input);
  }

  public recordRefundAllocation(input: LedgerRefundAllocation): Promise<void> {
    return this.ledger.recordRefundAllocation(input);
  }

  public rebuildVendorBalance(vendorId: string): Promise<VendorLedgerBalanceDto> {
    return this.ledger.rebuildVendorBalance(vendorId);
  }

  public getVendorBalance(vendorId: string): Promise<VendorLedgerBalanceDto | null> {
    return this.ledger.getVendorBalance(vendorId);
  }

  public listVendorEntries(
    vendorId: string,
    limit: number,
    offset: number,
  ): Promise<readonly VendorLedgerEntryDto[]> {
    return this.ledger.listVendorEntries(vendorId, limit, offset);
  }
}
