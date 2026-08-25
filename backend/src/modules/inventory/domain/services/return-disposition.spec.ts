import { describe, expect, it } from 'vitest';
import { dispositionForReturnCondition } from './return-disposition';

describe('dispositionForReturnCondition', () => {
  it('treats new/like-new/used as sellable', () => {
    expect(dispositionForReturnCondition('NEW')).toBe('SELLABLE');
    expect(dispositionForReturnCondition('LIKE_NEW')).toBe('SELLABLE');
    expect(dispositionForReturnCondition('USED')).toBe('SELLABLE');
  });

  it('quarantines damaged and unknown', () => {
    expect(dispositionForReturnCondition('DAMAGED')).toBe('UNSELLABLE');
    expect(dispositionForReturnCondition('DEFECTIVE')).toBe('UNSELLABLE');
    expect(dispositionForReturnCondition('UNSELLABLE')).toBe('UNSELLABLE');
    expect(dispositionForReturnCondition('UNKNOWN')).toBe('UNSELLABLE');
  });
});
