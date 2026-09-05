import { Inject, Injectable } from '@nestjs/common';
import { Money } from '../../../../shared-kernel/domain/money.value-object';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { DuplicateVariantAttributesError } from '../../domain/errors/catalog.errors';
import { Variant, type VariantCreateInput } from '../../domain/aggregates/variant.aggregate';
import {
  BarcodeAlreadyExistsError,
  CatalogSkuTakenError,
  ProductNotFoundError,
  VariantNotFoundError,
} from '../errors/catalog.errors';
import { Weight } from '../../domain/value-objects/weight.value-object';
import { PRODUCT_REPOSITORY, type ProductRepository } from '../ports/product-repository.interface';
import { VARIANT_REPOSITORY, type VariantRepository } from '../ports/variant-repository.interface';
import { CatalogAuthorizationService } from '../services/catalog-authorization.service';

function attributeFingerprint(
  attributes: ReadonlyArray<{ code: string; value: string | number | boolean | readonly string[] }>,
): string {
  return JSON.stringify(
    [...attributes]
      .map((item) => ({
        code: item.code.trim().toLowerCase(),
        value: item.value,
      }))
      .sort((a, b) => a.code.localeCompare(b.code)),
  );
}

export interface CreateVariantCommand {
  readonly productId: string;
  readonly actorUserId: string;
  readonly actorRoles: readonly string[];
  readonly name: string;
  readonly sku: string;
  readonly barcode?: string;
  readonly gtin?: string;
  readonly ean?: string;
  readonly upc?: string;
  readonly mpn?: string;
  readonly manufacturerReference?: string;
  readonly costPriceMinor?: number;
  readonly basePriceMinor?: number;
  readonly compareAtPriceMinor?: number;
  readonly currencyCode?: string;
  readonly weightGrams?: number;
  readonly dimensions?: {
    readonly lengthMillimeters: number;
    readonly widthMillimeters: number;
    readonly heightMillimeters: number;
  };
  readonly attributes?: VariantCreateInput['attributes'];
  readonly media?: VariantCreateInput['media'];
}

@Injectable()
export class CreateVariantHandler {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(VARIANT_REPOSITORY) private readonly variants: VariantRepository,
    @Inject(CatalogAuthorizationService) private readonly authz: CatalogAuthorizationService,
  ) {}

  public async execute(command: CreateVariantCommand): Promise<Variant> {
    const product = await this.products.findById(command.productId);
    if (!product) {
      throw new ProductNotFoundError();
    }
    const vendor = await this.authz.requireActiveVendor(product.vendorId);
    this.authz.assertCanMutate(vendor, command.actorUserId, command.actorRoles);

    if (
      await this.variants.existsByVendorAndSku(product.vendorId, command.sku.trim().toUpperCase())
    ) {
      throw new CatalogSkuTakenError();
    }
    if (
      command.barcode &&
      (await this.variants.existsByVendorAndBarcode(product.vendorId, command.barcode.trim()))
    ) {
      throw new BarcodeAlreadyExistsError();
    }

    const siblings = await this.variants.findByProductId(product.id.value);
    const currency = command.currencyCode ?? 'BDT';
    const input: VariantCreateInput = {
      name: command.name,
      sku: command.sku,
      ...(command.barcode !== undefined ? { barcode: command.barcode } : {}),
      ...(command.gtin !== undefined ? { gtin: command.gtin } : {}),
      ...(command.ean !== undefined ? { ean: command.ean } : {}),
      ...(command.upc !== undefined ? { upc: command.upc } : {}),
      ...(command.mpn !== undefined ? { mpn: command.mpn } : {}),
      ...(command.manufacturerReference !== undefined
        ? { manufacturerReference: command.manufacturerReference }
        : {}),
      ...(command.costPriceMinor !== undefined
        ? { costPrice: Money.create(command.costPriceMinor, currency) }
        : {}),
      ...(command.basePriceMinor !== undefined
        ? { basePrice: Money.create(command.basePriceMinor, currency) }
        : {}),
      ...(command.compareAtPriceMinor !== undefined
        ? { compareAtPrice: Money.create(command.compareAtPriceMinor, currency) }
        : {}),
      ...(command.weightGrams !== undefined ? { weight: Weight.create(command.weightGrams) } : {}),
      ...(command.dimensions !== undefined ? { dimensions: command.dimensions } : {}),
      ...(command.attributes !== undefined ? { attributes: command.attributes } : {}),
      ...(command.media !== undefined ? { media: command.media } : {}),
    };

    const fingerprint = attributeFingerprint(input.attributes ?? []);
    if (
      fingerprint !== '[]' &&
      siblings.some((sibling) => attributeFingerprint(sibling.attributes) === fingerprint)
    ) {
      throw new DuplicateVariantAttributesError();
    }

    const variant = Variant.create(UniqueID.from(product.id.value), input);
    product.attachVariant(variant.id.value);
    await this.variants.save(variant);
    await this.products.save(product);
    return variant;
  }
}

@Injectable()
export class VariantLifecycleHandler {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(VARIANT_REPOSITORY) private readonly variants: VariantRepository,
    @Inject(CatalogAuthorizationService) private readonly authz: CatalogAuthorizationService,
  ) {}

  public async activate(
    variantId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Variant> {
    const variant = await this.requireOwned(variantId, actorUserId, actorRoles);
    variant.activate();
    await this.variants.save(variant);
    return variant;
  }

  public async archive(
    variantId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Variant> {
    const variant = await this.requireOwned(variantId, actorUserId, actorRoles);
    variant.archive();
    await this.variants.save(variant);
    return variant;
  }

  private async requireOwned(
    variantId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Variant> {
    const variant = await this.variants.findById(variantId);
    if (!variant) {
      throw new VariantNotFoundError();
    }
    const product = await this.products.findById(variant.productId);
    if (!product) {
      throw new ProductNotFoundError();
    }
    const vendor = await this.authz.requireActiveVendor(product.vendorId);
    this.authz.assertCanMutate(vendor, actorUserId, actorRoles);
    return variant;
  }
}
