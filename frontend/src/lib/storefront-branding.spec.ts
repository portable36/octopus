import { describe, expect, it } from 'vitest';
import { brandMarkLetter, pickSiteName } from './storefront-branding';

describe('storefront branding helpers', () => {
  it('pickSiteName prefers trimmed branding name over fallback', () => {
    expect(pickSiteName('  Zip Market  ', 'Octopus')).toBe('Zip Market');
  });

  it('pickSiteName falls back when branding name is empty', () => {
    expect(pickSiteName(null, 'Octopus')).toBe('Octopus');
    expect(pickSiteName('   ', 'Octopus')).toBe('Octopus');
    expect(pickSiteName(undefined, 'Octopus')).toBe('Octopus');
  });

  it('brandMarkLetter uses the first character of the site name', () => {
    expect(brandMarkLetter('Octopus')).toBe('O.');
    expect(brandMarkLetter('zip trip')).toBe('Z.');
  });

  it('brandMarkLetter falls back when site name is blank', () => {
    expect(brandMarkLetter('')).toBe('O.');
    expect(brandMarkLetter('   ')).toBe('O.');
  });
});
