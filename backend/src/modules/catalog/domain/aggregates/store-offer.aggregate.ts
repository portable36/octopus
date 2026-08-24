import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { InvalidStoreOfferError } from '../errors/catalog.errors';
import type { StoreOfferStatus } from '../catalog.types';

interface StoreOfferProps {
  vendorId: string;
  storeId: string;
  productId: string;
  variantId: string;
  priceMinor: number;
  currencyCode: string;
  status: StoreOfferStatus;
  isAvailable: boolean;
}

export class StoreOffer extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: StoreOfferProps,
  ) {
    super(id);
  }

  public static create(input: {
    readonly vendorId: string;
    readonly storeId: string;
    readonly productId: string;
    readonly variantId: string;
    readonly priceMinor: number;
    readonly currencyCode: string;
  }): StoreOffer {
    if (!Number.isInteger(input.priceMinor) || input.priceMinor < 0) {
      throw new InvalidStoreOfferError('Offer price must be a non-negative integer minor amount.');
    }
    const currency = input.currencyCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new InvalidStoreOfferError('Currency must be a 3-letter ISO code.');
    }

    const offer = new StoreOffer(UniqueID.create(), {
      vendorId: input.vendorId,
      storeId: input.storeId,
      productId: input.productId,
      variantId: input.variantId,
      priceMinor: input.priceMinor,
      currencyCode: currency,
      status: 'draft',
      isAvailable: false,
    });

    offer.addEvent('StoreOfferCreated', {
      offerId: offer.id.value,
      storeId: input.storeId,
      variantId: input.variantId,
    });
    return offer;
  }

  public static rehydrate(input: {
    readonly id: string;
    readonly vendorId: string;
    readonly storeId: string;
    readonly productId: string;
    readonly variantId: string;
    readonly priceMinor: number;
    readonly currencyCode: string;
    readonly status: StoreOfferStatus;
    readonly isAvailable: boolean;
  }): StoreOffer {
    return new StoreOffer(UniqueID.from(input.id), { ...input });
  }

  get vendorId(): string {
    return this.props.vendorId;
  }

  get storeId(): string {
    return this.props.storeId;
  }

  get productId(): string {
    return this.props.productId;
  }

  get variantId(): string {
    return this.props.variantId;
  }

  get priceMinor(): number {
    return this.props.priceMinor;
  }

  get currencyCode(): string {
    return this.props.currencyCode;
  }

  get status(): StoreOfferStatus {
    return this.props.status;
  }

  get isAvailable(): boolean {
    return this.props.isAvailable;
  }

  public activate(): void {
    if (this.props.status === 'active') {
      throw new InvalidStoreOfferError('Offer is already active.');
    }
    this.props = { ...this.props, status: 'active', isAvailable: true };
    this.addEvent('StoreOfferActivated', { offerId: this.id.value });
  }

  public suspend(): void {
    if (this.props.status !== 'active') {
      throw new InvalidStoreOfferError('Only active offers can be suspended.');
    }
    this.props = { ...this.props, status: 'suspended', isAvailable: false };
    this.addEvent('StoreOfferSuspended', { offerId: this.id.value });
  }

  public updatePrice(priceMinor: number, currencyCode?: string): void {
    if (!Number.isInteger(priceMinor) || priceMinor < 0) {
      throw new InvalidStoreOfferError('Offer price must be a non-negative integer minor amount.');
    }
    this.props = {
      ...this.props,
      priceMinor,
      currencyCode: currencyCode ? currencyCode.trim().toUpperCase() : this.props.currencyCode,
    };
    this.addEvent('StoreOfferPriceUpdated', {
      offerId: this.id.value,
      priceMinor,
      currencyCode: this.props.currencyCode,
    });
  }
}
