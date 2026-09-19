import { describe, expect, it } from 'vitest';
import { assertValidContentBody } from './content-block.validation';
import { ContentDomainError } from './errors/content.errors';

describe('assertValidContentBody', () => {
  it('accepts legacy leaf bodies', () => {
    expect(() =>
      assertValidContentBody([
        { type: 'heading', level: 2, text: 'Hi' },
        { type: 'paragraph', text: 'Body' },
        { type: 'markdown', markdown: '# x' },
        { type: 'image', mediaId: 'm1' },
      ]),
    ).not.toThrow();
  });

  it('accepts one-level section with columns', () => {
    expect(() =>
      assertValidContentBody([
        {
          type: 'section',
          columns: 2,
          children: [
            [{ type: 'paragraph', text: 'L' }],
            [{ type: 'button', label: 'Go', href: '/search' }],
          ],
        },
      ]),
    ).not.toThrow();
  });

  it('rejects nested sections', () => {
    expect(() =>
      assertValidContentBody([
        {
          type: 'section',
          columns: 1,
          children: [
            [
              {
                type: 'section',
                columns: 1,
                children: [[{ type: 'paragraph', text: 'nope' }]],
              } as never,
            ],
          ],
        },
      ]),
    ).toThrowError(ContentDomainError);
  });

  it('rejects javascript button href', () => {
    expect(() =>
      assertValidContentBody([{ type: 'button', label: 'x', href: 'javascript:alert(1)' }]),
    ).toThrowError(ContentDomainError);
  });
});
