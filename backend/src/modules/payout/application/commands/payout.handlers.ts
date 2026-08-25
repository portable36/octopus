import { Inject, Injectable } from '@nestjs/common';
import { VendorPayout } from '../../domain/aggregates/vendor-payout.aggregate';
import {
  InsufficientPayoutBalanceError,
  InvalidPayoutTransitionError,
} from '../../domain/errors/payout.errors';
import { PayoutIdempotencyConflictError, PayoutNotFoundError } from '../errors/payout.errors';
import { PAYOUT_PROVIDER, type PayoutProviderPort } from '../ports/payout-provider.port';
import { PAYOUT_REPOSITORY, type PayoutRepository } from '../ports/payout-repository.interface';
import { PayoutAuthorizationService } from '../services/payout-authorization.service';
import { LedgerCommandHandler } from './ledger.handlers';

@Injectable()
export class PayoutCommandHandler {
  constructor(
    @Inject(PAYOUT_REPOSITORY) private readonly payouts: PayoutRepository,
    @Inject(PAYOUT_PROVIDER) private readonly provider: PayoutProviderPort,
    private readonly ledger: LedgerCommandHandler,
    private readonly authz: PayoutAuthorizationService,
  ) {}

  public async requestPayout(input: {
    readonly vendorId: string;
    readonly storeId: string;
    readonly amountMinor: number;
    readonly currencyCode?: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly idempotencyKey: string;
  }): Promise<VendorPayout> {
    const existing = await this.payouts.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      if (
        existing.vendorId !== input.vendorId ||
        existing.storeId !== input.storeId ||
        existing.amountMinor !== input.amountMinor
      ) {
        throw new PayoutIdempotencyConflictError();
      }
      return existing;
    }

    const { currencyCode: vendorCurrency } = await this.authz.requireRequester(
      input.vendorId,
      input.storeId,
      input.actorUserId,
      input.actorRoles,
    );
    const currencyCode = (input.currencyCode ?? vendorCurrency).trim().toUpperCase();

    const payout = VendorPayout.create({
      vendorId: input.vendorId,
      storeId: input.storeId,
      amountMinor: input.amountMinor,
      currencyCode,
      idempotencyKey: input.idempotencyKey,
      requestedByUserId: input.actorUserId,
    });

    await this.payouts.withTransaction(async (repo) => {
      await repo.lockVendorBalance(input.vendorId, currencyCode);
      const availableMinor = await repo.computeAvailableMinor(input.vendorId);
      const reservedMinor = await repo.sumReservedMinor(input.vendorId);
      const spendable = availableMinor - reservedMinor;
      if (input.amountMinor > spendable) {
        throw new InsufficientPayoutBalanceError(Math.max(0, spendable), input.amountMinor);
      }
      await repo.save(payout);
      await repo.appendOutbox({
        aggregateId: payout.id.value,
        eventType: 'PayoutRequested',
        payload: {
          payoutId: payout.id.value,
          vendorId: payout.vendorId,
          storeId: payout.storeId,
          amountMinor: payout.amountMinor,
          currencyCode: payout.currencyCode,
          status: payout.status,
        },
      });
    });

    return (await this.payouts.findById(payout.id.value)) ?? payout;
  }

  public async listPayouts(input: {
    readonly vendorId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly limit: number;
    readonly offset: number;
  }): Promise<readonly VendorPayout[]> {
    await this.authz.requireReader(input.vendorId, input.actorUserId, input.actorRoles);
    return this.payouts.listByVendorId(input.vendorId, input.limit, input.offset);
  }

  public async getPayout(input: {
    readonly payoutId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<VendorPayout> {
    const payout = await this.requirePayout(input.payoutId);
    await this.authz.requireReader(payout.vendorId, input.actorUserId, input.actorRoles);
    return payout;
  }

  public async approvePayout(input: {
    readonly payoutId: string;
    readonly actorRoles: readonly string[];
  }): Promise<VendorPayout> {
    this.authz.requireApprover(input.actorRoles);
    const payout = await this.requirePayout(input.payoutId);
    if (
      payout.status === 'APPROVED' ||
      payout.status === 'PROCESSING' ||
      payout.status === 'COMPLETED'
    ) {
      return payout;
    }
    payout.approve();
    await this.payouts.save(payout);
    await this.payouts.appendOutbox({
      aggregateId: payout.id.value,
      eventType: 'PayoutApproved',
      payload: { payoutId: payout.id.value, vendorId: payout.vendorId },
    });
    return payout;
  }

  public async rejectPayout(input: {
    readonly payoutId: string;
    readonly actorRoles: readonly string[];
    readonly reason: string;
  }): Promise<VendorPayout> {
    this.authz.requireApprover(input.actorRoles);
    const payout = await this.requirePayout(input.payoutId);
    if (payout.status === 'REJECTED') {
      return payout;
    }
    payout.reject(input.reason);
    await this.payouts.save(payout);
    await this.payouts.appendOutbox({
      aggregateId: payout.id.value,
      eventType: 'PayoutRejected',
      payload: {
        payoutId: payout.id.value,
        vendorId: payout.vendorId,
        reason: payout.rejectionReason,
      },
    });
    return payout;
  }

  public async processPayout(input: {
    readonly payoutId: string;
    readonly actorRoles: readonly string[];
  }): Promise<VendorPayout> {
    this.authz.requireProcessor(input.actorRoles);
    let payout = await this.requirePayout(input.payoutId);
    if (payout.status === 'COMPLETED' || payout.status === 'FAILED') {
      return payout;
    }

    if (payout.status === 'APPROVED') {
      payout.startProcessing();
      await this.payouts.save(payout);
    } else if (payout.status !== 'PROCESSING') {
      throw new InvalidPayoutTransitionError(payout.status, 'PROCESSING');
    }

    // Provider call outside DB transaction (stub today; real bank/bKash later).
    const disbursement = await this.provider.disburse({
      payoutId: payout.id.value,
      vendorId: payout.vendorId,
      amountMinor: payout.amountMinor,
      currencyCode: payout.currencyCode,
    });

    if (!disbursement.ok) {
      payout = await this.requirePayout(input.payoutId);
      if (payout.status === 'COMPLETED') {
        return payout;
      }
      if (payout.status === 'PROCESSING') {
        payout.fail(disbursement.reason);
        await this.payouts.save(payout);
        await this.payouts.appendOutbox({
          aggregateId: payout.id.value,
          eventType: 'PayoutFailed',
          payload: {
            payoutId: payout.id.value,
            vendorId: payout.vendorId,
            reason: payout.failureReason,
          },
        });
      }
      return payout;
    }

    const ledgerEntryId = await this.ledger.recordPayoutDebit({
      payoutId: payout.id.value,
      vendorId: payout.vendorId,
      storeId: payout.storeId,
      amountMinor: payout.amountMinor,
      currencyCode: payout.currencyCode,
      providerRef: disbursement.providerRef,
    });

    payout = await this.requirePayout(input.payoutId);
    if (payout.status === 'COMPLETED') {
      return payout;
    }
    if (payout.status !== 'PROCESSING') {
      throw new InvalidPayoutTransitionError(payout.status, 'COMPLETED');
    }
    payout.complete({
      providerRef: disbursement.providerRef,
      ledgerEntryId,
    });
    await this.payouts.save(payout);
    return payout;
  }

  private async requirePayout(payoutId: string): Promise<VendorPayout> {
    const payout = await this.payouts.findById(payoutId);
    if (!payout) {
      throw new PayoutNotFoundError();
    }
    return payout;
  }
}
