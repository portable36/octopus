import { describe, expect, it } from 'vitest';
import { resolvePrimaryImageMediaId } from './resolve-primary-image-media-id';

describe('resolvePrimaryImageMediaId', () => {
  it('returns primary image media id', () => {
    expect(
      resolvePrimaryImageMediaId([
        { mediaId: 'a', mediaType: 'IMAGE', isPrimary: false, sortOrder: 1 },
        { mediaId: 'b', mediaType: 'IMAGE', isPrimary: true, sortOrder: 0 },
      ]),
    ).toBe('b');
  });

  it('falls back to first image when no primary is set', () => {
    expect(
      resolvePrimaryImageMediaId([
        { mediaId: 'first', mediaType: 'IMAGE', isPrimary: false, sortOrder: 0 },
      ]),
    ).toBe('first');
  });

  it('returns null for empty or invalid media', () => {
    expect(resolvePrimaryImageMediaId([])).toBeNull();
    expect(resolvePrimaryImageMediaId(null)).toBeNull();
  });
});
