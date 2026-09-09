import { describe, expect, it } from 'vitest';
import { colorInputValue, normalizeCssHexColor } from './css-hex-color';

describe('normalizeCssHexColor', () => {
  it('adds missing # and lowercases 6-digit hex', () => {
    expect(normalizeCssHexColor('fcca19')).toBe('#fcca19');
    expect(normalizeCssHexColor('#FCCA19')).toBe('#fcca19');
  });

  it('expands 3-digit hex', () => {
    expect(normalizeCssHexColor('fc1')).toBe('#ffcc11');
    expect(normalizeCssHexColor('#AbC')).toBe('#aabbcc');
  });

  it('rejects invalid colors', () => {
    expect(normalizeCssHexColor('')).toBeNull();
    expect(normalizeCssHexColor('blue')).toBeNull();
    expect(normalizeCssHexColor('fcca1')).toBeNull();
    expect(normalizeCssHexColor('#gg0000')).toBeNull();
    expect(normalizeCssHexColor(null)).toBeNull();
  });
});

describe('colorInputValue', () => {
  it('falls back when raw is incomplete or invalid', () => {
    expect(colorInputValue('fcca19', '#2563eb')).toBe('#fcca19');
    expect(colorInputValue('fcca', '#2563eb')).toBe('#2563eb');
    expect(colorInputValue('', '#0f172a')).toBe('#0f172a');
  });
});
