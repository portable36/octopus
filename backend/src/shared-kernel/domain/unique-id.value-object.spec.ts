import { describe, expect, it } from 'vitest';
import { UniqueID } from './unique-id.value-object';

describe('UniqueID', () => {
  it('generates a valid UUIDv7', () => {
    const id = UniqueID.create();
    const uuidV7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(id.value).toMatch(uuidV7Regex);
  });

  it('embeds a millisecond timestamp', () => {
    const before = Date.now();
    const id = UniqueID.create();
    const after = Date.now();

    const hex = id.value.replace(/-/g, '');
    const timestamp = parseInt(hex.slice(0, 12), 16);

    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => UniqueID.create().value));
    expect(ids.size).toBe(1000);
  });

  it('round-trips through from()', () => {
    const original = UniqueID.create();
    const restored = UniqueID.from(original.value);
    expect(restored.equals(original)).toBe(true);
  });

  it('rejects UUIDv4 format on from()', () => {
    const v4 = '550e8400-e29b-41d4-a716-446655440000';
    expect(() => UniqueID.from(v4)).toThrow('Invalid UUIDv7');
  });

  it('rejects garbage strings', () => {
    expect(() => UniqueID.from('not-a-uuid')).toThrow('Invalid UUIDv7');
  });

  it('rejects empty string', () => {
    expect(() => UniqueID.from('')).toThrow('Invalid UUIDv7');
  });
});
