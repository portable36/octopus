import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  CouponCustomerLimitReachedError,
  CouponExpiredError,
  CouponMinOrderError,
  CouponNotYetActiveError,
  CouponStoreRestrictionError,
  CouponUsageLimitReachedError,
  CouponVendorRestrictionError,
  InvalidMoneyInputError,
  InvalidPromotionError,
} from '../errors/pricing.errors';
import type {
  DiscountType,
  PromotionScope,
  PromotionStatus,
  QuoteLineInput,
} from '../pricing.types';

interface PromotionProps {
  readonly vendorId: string;
  readonly storeId: string;
  readonly name: string;
  readonly couponCode: string | null;
  readonly discountType: DiscountType;
  /** For PERCENTAGE: 1–100 integer percent. For FIXED: amount in minor units. */
  readonly discountValue: number;
  readonly currencyCode: string;
  readonly minOrderAmountMinor: number;
  readonly scope: PromotionScope;
  readonly scopeIds: readonly string[];
  readonly usageLimit: number | null;
  readonly usageCount: number;
  readonly perCustomerLimit: number | null;
  readonly startsAt: Date;
  readonly endsAt: Date | null;
  readonly status: PromotionStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class Promotion extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: PromotionProps,
  ) {
    super(id);
  }

  public static create(input: {
    readonly vendorId: string;
    readonly storeId: string;
    readonly name: string;
    readonly couponCode?: string | null;
    readonly discountType: DiscountType;
    readonly discountValue: number;
    readonly currencyCode: string;
    readonly minOrderAmountMinor?: number;
    readonly scope: PromotionScope;
    readonly scopeIds?: readonly string[];
    readonly usageLimit?: number | null;
    readonly perCustomerLimit?: number | null;
    readonly startsAt: Date;
    readonly endsAt?: Date | null;
  }): Promotion {
    const currencyCode = input.currencyCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currencyCode)) {
      throw new InvalidPromotionError('Currency must be a 3-letter ISO 4217 code.');
    }
    if (!Number.isInteger(input.discountValue) || input.discountValue <= 0) {
      throw new InvalidPromotionError('Discount value must be a positive integer.');
    }
    if (input.discountType === 'PERCENTAGE' && input.discountValue > 100) {
      throw new InvalidPromotionError('Percentage discount cannot exceed 100.');
    }
    const minOrder = input.minOrderAmountMinor ?? 0;
    if (!Number.isInteger(minOrder) || minOrder < 0) {
      throw new InvalidPromotionError('Minimum order amount must be a non-negative integer.');
    }
    if (
      input.usageLimit !== undefined &&
      input.usageLimit !== null &&
      (!Number.isInteger(input.usageLimit) || input.usageLimit <= 0)
    ) {
      throw new InvalidPromotionError('Usage limit must be a positive integer when set.');
    }
    if (
      input.perCustomerLimit !== undefined &&
      input.perCustomerLimit !== null &&
      (!Number.isInteger(input.perCustomerLimit) || input.perCustomerLimit <= 0)
    ) {
      throw new InvalidPromotionError('Per-customer limit must be a positive integer when set.');
    }
    const scopeIds = Object.freeze([...(input.scopeIds ?? [])]);
    if ((input.scope === 'PRODUCT' || input.scope === 'CATEGORY') && scopeIds.length === 0) {
      throw new InvalidPromotionError(`${input.scope} scope requires at least one scope id.`);
    }
    if (input.endsAt && input.endsAt.getTime() <= input.startsAt.getTime()) {
      throw new InvalidPromotionError('endsAt must be after startsAt.');
    }

    const couponCode =
      input.couponCode === undefined || input.couponCode === null || input.couponCode.trim() === ''
        ? null
        : input.couponCode.trim().toUpperCase();

    const now = new Date();
    const promotion = new Promotion(UniqueID.create(), {
      vendorId: input.vendorId,
      storeId: input.storeId,
      name: input.name.trim(),
      couponCode,
      discountType: input.discountType,
      discountValue: input.discountValue,
      currencyCode,
      minOrderAmountMinor: minOrder,
      scope: input.scope,
      scopeIds,
      usageLimit: input.usageLimit ?? null,
      usageCount: 0,
      perCustomerLimit: input.perCustomerLimit ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    });
    promotion.addEvent('PromotionCreated', {
      promotionId: promotion.id.value,
      vendorId: promotion.vendorId,
      storeId: promotion.storeId,
      couponCode: promotion.couponCode,
    });
    return promotion;
  }

  public static reconstitute(id: UniqueID, props: PromotionProps): Promotion {
    return new Promotion(id, props);
  }

  get vendorId(): string {
    return this.props.vendorId;
  }
  get storeId(): string {
    return this.props.storeId;
  }
  get name(): string {
    return this.props.name;
  }
  get couponCode(): string | null {
    return this.props.couponCode;
  }
  get discountType(): DiscountType {
    return this.props.discountType;
  }
  get discountValue(): number {
    return this.props.discountValue;
  }
  get currencyCode(): string {
    return this.props.currencyCode;
  }
  get minOrderAmountMinor(): number {
    return this.props.minOrderAmountMinor;
  }
  get scope(): PromotionScope {
    return this.props.scope;
  }
  get scopeIds(): readonly string[] {
    return this.props.scopeIds;
  }
  get usageLimit(): number | null {
    return this.props.usageLimit;
  }
  get usageCount(): number {
    return this.props.usageCount;
  }
  get perCustomerLimit(): number | null {
    return this.props.perCustomerLimit;
  }
  get startsAt(): Date {
    return this.props.startsAt;
  }
  get endsAt(): Date | null {
    return this.props.endsAt;
  }
  get status(): PromotionStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public activate(): void {
    if (this.props.status === 'ACTIVE') {
      return;
    }
    this.props = { ...this.props, status: 'ACTIVE', updatedAt: new Date() };
    this.addEvent('PromotionActivated', { promotionId: this.id.value });
  }

  public disable(): void {
    if (this.props.status === 'DISABLED') {
      return;
    }
    this.props = { ...this.props, status: 'DISABLED', updatedAt: new Date() };
    this.addEvent('PromotionDisabled', { promotionId: this.id.value });
  }

  public assertApplicable(input: {
    readonly vendorId: string;
    readonly storeId: string;
    readonly currencyCode: string;
    readonly subtotalMinor: number;
    readonly at: Date;
    readonly customerUsageCount?: number;
  }): void {
    if (this.props.status !== 'ACTIVE') {
      throw new InvalidPromotionError('Promotion is not active.');
    }
    if (input.currencyCode !== this.props.currencyCode) {
      throw new InvalidMoneyInputError('Promotion currency does not match quote currency.');
    }
    if (this.props.scope === 'VENDOR' || this.props.vendorId) {
      if (input.vendorId !== this.props.vendorId) {
        throw new CouponVendorRestrictionError();
      }
    }
    if (this.props.scope === 'STORE' && input.storeId !== this.props.storeId) {
      throw new CouponStoreRestrictionError();
    }
    if (input.at.getTime() < this.props.startsAt.getTime()) {
      throw new CouponNotYetActiveError();
    }
    if (this.props.endsAt && input.at.getTime() > this.props.endsAt.getTime()) {
      throw new CouponExpiredError();
    }
    if (this.props.usageLimit !== null && this.props.usageCount >= this.props.usageLimit) {
      throw new CouponUsageLimitReachedError();
    }
    if (
      this.props.perCustomerLimit !== null &&
      (input.customerUsageCount ?? 0) >= this.props.perCustomerLimit
    ) {
      throw new CouponCustomerLimitReachedError();
    }
    if (input.subtotalMinor < this.props.minOrderAmountMinor) {
      throw new CouponMinOrderError(this.props.minOrderAmountMinor);
    }
  }

  public isLineEligible(line: QuoteLineInput): boolean {
    switch (this.props.scope) {
      case 'ALL':
      case 'VENDOR':
      case 'STORE':
        return true;
      case 'PRODUCT':
        return this.props.scopeIds.includes(line.productId);
      case 'CATEGORY':
        return line.categoryIds.some((id) => this.props.scopeIds.includes(id));
      default: {
        const _exhaustive: never = this.props.scope;
        return _exhaustive;
      }
    }
  }

  /** Integer-safe discount for an eligible subtotal (minor units). */
  public computeDiscountMinor(eligibleSubtotalMinor: number): number {
    if (!Number.isInteger(eligibleSubtotalMinor) || eligibleSubtotalMinor < 0) {
      throw new InvalidMoneyInputError('Eligible subtotal must be a non-negative integer.');
    }
    if (eligibleSubtotalMinor === 0) {
      return 0;
    }
    if (this.props.discountType === 'FIXED') {
      return Math.min(this.props.discountValue, eligibleSubtotalMinor);
    }
    return Math.round((eligibleSubtotalMinor * this.props.discountValue) / 100);
  }

  public recordUsage(): void {
    if (this.props.usageLimit !== null && this.props.usageCount >= this.props.usageLimit) {
      throw new CouponUsageLimitReachedError();
    }
    this.props = {
      ...this.props,
      usageCount: this.props.usageCount + 1,
      updatedAt: new Date(),
    };
    this.addEvent('PromotionUsageRecorded', {
      promotionId: this.id.value,
      usageCount: this.props.usageCount,
    });
  }
}
