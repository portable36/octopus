import { describe, expect, it } from 'vitest';
import { renderTemplate } from './notification.types';

describe('renderTemplate', () => {
  it('replaces known tokens', () => {
    expect(renderTemplate('Hello {{name}}', { name: 'Ada' })).toBe('Hello Ada');
  });

  it('blanks unknown tokens', () => {
    expect(renderTemplate('Hi {{name}}', {})).toBe('Hi ');
  });
});
