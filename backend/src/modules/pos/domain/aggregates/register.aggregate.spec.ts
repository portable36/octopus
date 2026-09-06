import { describe, expect, it } from 'vitest';
import { Register } from './register.aggregate';
import { InvalidRegisterError } from '../errors/pos.errors';

describe('Register Aggregate', () => {
  const storeId = '0191c0a0-0000-7000-8000-000000000001';
  const vendorId = '0191c0a0-0000-7000-8000-000000000002';

  it('creates an active register with valid properties and normalized uppercase code', () => {
    const register = Register.create({
      storeId,
      vendorId,
      code: ' reg-01 ',
      name: ' Main Counter ',
      notes: ' Front counter register ',
    });

    expect(register.id).toBeDefined();
    expect(register.storeId).toBe(storeId);
    expect(register.vendorId).toBe(vendorId);
    expect(register.code).toBe('REG-01');
    expect(register.name).toBe('Main Counter');
    expect(register.status).toBe('ACTIVE');
    expect(register.isActive).toBe(true);
    expect(register.isDecommissioned).toBe(false);
    expect(register.notes).toBe('Front counter register');
    expect(register.createdAt).toBeInstanceOf(Date);
    expect(register.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects empty or whitespace-only code', () => {
    expect(() =>
      Register.create({
        storeId,
        vendorId,
        code: '   ',
        name: 'Main Counter',
      }),
    ).toThrow(InvalidRegisterError);
  });

  it('rejects code with invalid characters', () => {
    expect(() =>
      Register.create({
        storeId,
        vendorId,
        code: 'REG#01!',
        name: 'Main Counter',
      }),
    ).toThrow(InvalidRegisterError);
  });

  it('rejects empty name', () => {
    expect(() =>
      Register.create({
        storeId,
        vendorId,
        code: 'REG-01',
        name: '   ',
      }),
    ).toThrow(InvalidRegisterError);
  });

  it('allows activating and deactivating an active register', () => {
    const register = Register.create({
      storeId,
      vendorId,
      code: 'REG-01',
      name: 'Counter 1',
    });

    register.deactivate();
    expect(register.status).toBe('INACTIVE');
    expect(register.isActive).toBe(false);

    register.activate();
    expect(register.status).toBe('ACTIVE');
    expect(register.isActive).toBe(true);
  });

  it('allows renaming and updating notes', () => {
    const register = Register.create({
      storeId,
      vendorId,
      code: 'REG-01',
      name: 'Counter 1',
    });

    register.rename('Front Counter 1');
    expect(register.name).toBe('Front Counter 1');

    register.updateNotes('Updated notes');
    expect(register.notes).toBe('Updated notes');

    register.updateNotes(null);
    expect(register.notes).toBeNull();
  });

  it('prevents modifying a decommissioned register', () => {
    const register = Register.create({
      storeId,
      vendorId,
      code: 'REG-01',
      name: 'Counter 1',
    });

    register.decommission();
    expect(register.status).toBe('DECOMMISSIONED');
    expect(register.isDecommissioned).toBe(true);
    expect(register.isActive).toBe(false);

    expect(() => register.activate()).toThrow(InvalidRegisterError);
    expect(() => register.deactivate()).toThrow(InvalidRegisterError);
    expect(() => register.rename('New Name')).toThrow(InvalidRegisterError);
    expect(() => register.updateNotes('New Notes')).toThrow(InvalidRegisterError);
  });
});
