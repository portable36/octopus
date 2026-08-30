import { Inject, Injectable, Optional } from '@nestjs/common';
import { AUDIT_PORT, type AuditPort } from '../../../../shared-kernel/application/ports/audit.port';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import { Product } from '../../domain/aggregates/product.aggregate';
import type { CatalogAttributeAssignment, CatalogMediaReference } from '../../domain/catalog.types';
import {
  CatalogAccessDeniedError,
  CatalogSkuTakenError,
  ProductNotFoundError,
} from '../errors/catalog.errors';
import { PRODUCT_REPOSITORY, type ProductRepository } from '../ports/product-repository.interface';
import { CatalogAuthorizationService } from '../services/catalog-authorization.service';

export interface CreateProductCommand {
  readonly vendorId: string;
  readonly actorUserId: string;
  readonly actorRoles: readonly string[];
  readonly sku: string;
  readonly name: string;
  readonly description?: string | null;
  readonly brandId?: string | null;
  readonly categoryIds?: readonly string[];
}

@Injectable()
export class CreateProductHandler {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(CatalogAuthorizationService) private readonly authz: CatalogAuthorizationService,
  ) {}

  public async execute(command: CreateProductCommand): Promise<Product> {
    const vendor = await this.authz.requireActiveVendor(command.vendorId);
    this.authz.assertCanMutate(vendor, command.actorUserId, command.actorRoles);

    const product = Product.create({
      vendorId: command.vendorId,
      sku: command.sku,
      name: command.name,
      ...(command.description !== undefined ? { description: command.description } : {}),
      ...(command.brandId !== undefined ? { brandId: command.brandId } : {}),
      ...(command.categoryIds !== undefined ? { categoryIds: command.categoryIds } : {}),
    });

    if (await this.products.existsByVendorAndSku(command.vendorId, product.sku)) {
      throw new CatalogSkuTakenError();
    }

    await this.products.save(product);
    return product;
  }
}

@Injectable()
export class ProductLifecycleHandler {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(CatalogAuthorizationService) private readonly authz: CatalogAuthorizationService,
    @Optional() @Inject(AUDIT_PORT) private readonly audit: AuditPort | null = null,
  ) {}

  public async submitForReview(
    productId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Product> {
    const product = await this.requireOwned(productId, actorUserId, actorRoles);
    product.submitForReview();
    await this.products.save(product);
    return product;
  }

  public async publish(
    productId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Product> {
    const product = await this.requireOwned(productId, actorUserId, actorRoles);
    product.publish();
    await this.products.save(product);
    return product;
  }

  public async unpublish(
    productId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Product> {
    const product = await this.requireOwned(productId, actorUserId, actorRoles);
    product.unpublish();
    await this.products.save(product);
    return product;
  }

  public async archive(
    productId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Product> {
    const product = await this.requireOwned(productId, actorUserId, actorRoles);
    product.archive();
    await this.products.save(product);
    return product;
  }

  public async update(
    productId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    patch: {
      readonly name?: string;
      readonly description?: string | null;
      readonly brandId?: string | null;
      readonly categoryIds?: readonly string[];
      readonly attributes?: readonly CatalogAttributeAssignment[];
      readonly media?: readonly CatalogMediaReference[];
    },
  ): Promise<Product> {
    const product = await this.requireOwned(productId, actorUserId, actorRoles);
    const before = {
      name: product.name,
      description: product.description,
      brandId: product.brandId,
      status: product.status,
    };
    if (patch.name !== undefined) product.rename(patch.name);
    if (patch.description !== undefined) product.updateDescription(patch.description);
    if (patch.brandId !== undefined) product.assignBrand(patch.brandId);
    if (patch.categoryIds !== undefined) product.setCategories(patch.categoryIds);
    if (patch.attributes !== undefined) product.setAttributes(patch.attributes);
    if (patch.media !== undefined) product.setMedia(patch.media);
    await this.products.save(product);
    await this.audit?.append({
      actorUserId,
      action: 'catalog.product.updated',
      resourceType: 'product',
      resourceId: product.id.value,
      vendorId: product.vendorId,
      before,
      after: {
        name: product.name,
        description: product.description,
        brandId: product.brandId,
        status: product.status,
      },
    });
    return product;
  }

  private async requireOwned(
    productId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Product> {
    const product = await this.products.findById(productId);
    if (!product) {
      throw new ProductNotFoundError();
    }
    const vendor = await this.authz.requireActiveVendor(product.vendorId);
    this.authz.assertCanMutate(vendor, actorUserId, actorRoles);
    return product;
  }
}

@Injectable()
export class GetProductHandler {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
  ) {}

  public async byId(
    productId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Product> {
    const product = await this.products.findById(productId);
    if (!product) {
      throw new ProductNotFoundError();
    }
    if (product.status === 'published' || actorRoles.includes('PLATFORM_ADMIN')) {
      return product;
    }
    const vendor = await this.vendors.findById(product.vendorId);
    if (vendor && vendor.staffUserIds.includes(actorUserId)) {
      return product;
    }
    throw new CatalogAccessDeniedError();
  }

  public async forVendor(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Product[]> {
    if (actorRoles.includes('PLATFORM_ADMIN')) {
      return this.products.findByVendorId(vendorId);
    }
    const vendor = await this.vendors.findById(vendorId);
    if (!vendor || !vendor.staffUserIds.includes(actorUserId)) {
      throw new CatalogAccessDeniedError();
    }
    return this.products.findByVendorId(vendorId);
  }
}
