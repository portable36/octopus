import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { InvalidRegisterError } from '../errors/pos.errors';

export type RegisterStatus = 'ACTIVE' | 'INACTIVE' | 'DECOMMISSIONED';

export interface RegisterProps {
  readonly storeId: string;
  readonly vendorId: string;
  readonly code: string;
  readonly name: string;
  readonly status: RegisterStatus;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class Register extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: RegisterProps,
  ) {
    super(id);
  }

  public static create(input: {
    readonly storeId: string;
    readonly vendorId: string;
    readonly code: string;
    readonly name: string;
    readonly notes?: string | null | undefined;
  }): Register {
    const storeId = input.storeId?.trim();
    if (!storeId) {
      throw new InvalidRegisterError('storeId is required.');
    }
    const vendorId = input.vendorId?.trim();
    if (!vendorId) {
      throw new InvalidRegisterError('vendorId is required.');
    }

    const code = Register.normalizeCode(input.code);
    const name = Register.normalizeName(input.name);
    const notes = Register.normalizeNotes(input.notes);

    const now = new Date();
    return new Register(UniqueID.create(), {
      storeId,
      vendorId,
      code,
      name,
      status: 'ACTIVE',
      notes,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static rehydrate(id: UniqueID, props: RegisterProps): Register {
    return new Register(id, props);
  }

  get storeId(): string {
    return this.props.storeId;
  }

  get vendorId(): string {
    return this.props.vendorId;
  }

  get code(): string {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }

  get status(): RegisterStatus {
    return this.props.status;
  }

  get notes(): string | null {
    return this.props.notes;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isActive(): boolean {
    return this.props.status === 'ACTIVE';
  }

  get isDecommissioned(): boolean {
    return this.props.status === 'DECOMMISSIONED';
  }

  public rename(newName: string): void {
    this.assertNotDecommissioned();
    const name = Register.normalizeName(newName);
    this.props = {
      ...this.props,
      name,
      updatedAt: new Date(),
    };
  }

  public updateNotes(newNotes?: string | null): void {
    this.assertNotDecommissioned();
    const notes = Register.normalizeNotes(newNotes);
    this.props = {
      ...this.props,
      notes,
      updatedAt: new Date(),
    };
  }

  public activate(): void {
    this.assertNotDecommissioned();
    if (this.props.status === 'ACTIVE') {
      return;
    }
    this.props = {
      ...this.props,
      status: 'ACTIVE',
      updatedAt: new Date(),
    };
  }

  public deactivate(): void {
    this.assertNotDecommissioned();
    if (this.props.status === 'INACTIVE') {
      return;
    }
    this.props = {
      ...this.props,
      status: 'INACTIVE',
      updatedAt: new Date(),
    };
  }

  public decommission(): void {
    if (this.props.status === 'DECOMMISSIONED') {
      return;
    }
    this.props = {
      ...this.props,
      status: 'DECOMMISSIONED',
      updatedAt: new Date(),
    };
  }

  private assertNotDecommissioned(): void {
    if (this.props.status === 'DECOMMISSIONED') {
      throw new InvalidRegisterError('Cannot modify a decommissioned register.');
    }
  }

  private static normalizeCode(raw: string): string {
    const code = raw?.trim().toUpperCase();
    if (!code) {
      throw new InvalidRegisterError('Register code is required.');
    }
    if (code.length < 1 || code.length > 32) {
      throw new InvalidRegisterError('Register code must be between 1 and 32 characters.');
    }
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      throw new InvalidRegisterError(
        'Register code may only contain alphanumeric characters, underscores, and hyphens.',
      );
    }
    return code;
  }

  private static normalizeName(raw: string): string {
    const name = raw?.trim();
    if (!name) {
      throw new InvalidRegisterError('Register name is required.');
    }
    if (name.length < 1 || name.length > 120) {
      throw new InvalidRegisterError('Register name must be between 1 and 120 characters.');
    }
    return name;
  }

  private static normalizeNotes(raw?: string | null): string | null {
    if (raw === undefined || raw === null) {
      return null;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.length > 500) {
      throw new InvalidRegisterError('Register notes must be at most 500 characters.');
    }
    return trimmed;
  }
}
