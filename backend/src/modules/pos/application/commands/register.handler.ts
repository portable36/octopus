import { Inject, Injectable } from '@nestjs/common';
import { Register, type RegisterStatus } from '../../domain/aggregates/register.aggregate';
import {
  REGISTER_REPOSITORY,
  type RegisterRepository,
} from '../ports/register-repository.interface';
import { PosAuthorizationService } from '../services/pos-authorization.service';
import { RegisterCodeAlreadyExistsError, RegisterNotFoundError } from '../errors/pos.errors';

export type CreateRegisterCommand = {
  readonly storeId: string;
  readonly actorUserId: string;
  readonly actorRoles: readonly string[];
  readonly code: string;
  readonly name: string;
  readonly notes?: string | null | undefined;
};

export type UpdateRegisterCommand = {
  readonly storeId: string;
  readonly registerId: string;
  readonly actorUserId: string;
  readonly actorRoles: readonly string[];
  readonly name?: string | undefined;
  readonly status?: RegisterStatus | undefined;
  readonly notes?: string | null | undefined;
};

@Injectable()
export class RegisterHandler {
  constructor(
    @Inject(REGISTER_REPOSITORY) private readonly registers: RegisterRepository,
    private readonly auth: PosAuthorizationService,
  ) {}

  public async createRegister(command: CreateRegisterCommand): Promise<Register> {
    const store = await this.auth.requireRegisterManager(
      command.storeId,
      command.actorUserId,
      command.actorRoles,
    );

    const normalizedCode = command.code.trim().toUpperCase();
    const existing = await this.registers.findByStoreAndCode(command.storeId, normalizedCode);
    if (existing) {
      throw new RegisterCodeAlreadyExistsError(normalizedCode);
    }

    const register = Register.create({
      storeId: command.storeId,
      vendorId: store.vendorId,
      code: command.code,
      name: command.name,
      notes: command.notes,
    });

    await this.registers.save(register);
    return register;
  }

  public async listRegisters(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<readonly Register[]> {
    await this.auth.requireRegisterViewer(storeId, actorUserId, actorRoles);
    return this.registers.findByStoreId(storeId);
  }

  public async getRegister(
    storeId: string,
    registerId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Register> {
    await this.auth.requireRegisterViewer(storeId, actorUserId, actorRoles);
    const register = await this.registers.findById(registerId);
    if (!register || register.storeId !== storeId) {
      throw new RegisterNotFoundError();
    }
    return register;
  }

  public async updateRegister(command: UpdateRegisterCommand): Promise<Register> {
    await this.auth.requireRegisterManager(
      command.storeId,
      command.actorUserId,
      command.actorRoles,
    );

    const register = await this.registers.findById(command.registerId);
    if (!register || register.storeId !== command.storeId) {
      throw new RegisterNotFoundError();
    }

    if (command.name !== undefined) {
      register.rename(command.name);
    }
    if (command.notes !== undefined) {
      register.updateNotes(command.notes);
    }
    if (command.status !== undefined) {
      if (command.status === 'ACTIVE') {
        register.activate();
      } else if (command.status === 'INACTIVE') {
        register.deactivate();
      } else if (command.status === 'DECOMMISSIONED') {
        register.decommission();
      }
    }

    await this.registers.save(register);
    return register;
  }
}
