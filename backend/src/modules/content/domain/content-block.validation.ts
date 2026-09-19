import type { ContentBlock, ContentLeafBlock, ContentSectionBlock } from './content.types';
import { ContentDomainError } from './errors/content.errors';

const HTTPS_OR_PATH = /^(https:\/\/[^\s]+|\/[A-Za-z0-9/_?&=#.\-~%]*)$/;

function assertLeaf(block: ContentLeafBlock, path: string): void {
  switch (block.type) {
    case 'heading':
      if (![1, 2, 3].includes(block.level) || typeof block.text !== 'string') {
        throw new ContentDomainError(`Invalid heading at ${path}.`, 'CONTENT_BLOCK_INVALID');
      }
      return;
    case 'paragraph':
      if (typeof block.text !== 'string') {
        throw new ContentDomainError(`Invalid paragraph at ${path}.`, 'CONTENT_BLOCK_INVALID');
      }
      return;
    case 'markdown':
      if (typeof block.markdown !== 'string') {
        throw new ContentDomainError(`Invalid markdown at ${path}.`, 'CONTENT_BLOCK_INVALID');
      }
      return;
    case 'image':
      if (!block.mediaId?.trim()) {
        throw new ContentDomainError(`Image mediaId required at ${path}.`, 'CONTENT_BLOCK_INVALID');
      }
      return;
    case 'button': {
      if (!block.label?.trim()) {
        throw new ContentDomainError(`Button label required at ${path}.`, 'CONTENT_BLOCK_INVALID');
      }
      const href = block.href?.trim() ?? '';
      if (!HTTPS_OR_PATH.test(href) || href.toLowerCase().startsWith('javascript:')) {
        throw new ContentDomainError(
          `Button href must be a relative path or https URL at ${path}.`,
          'CONTENT_BLOCK_INVALID_HREF',
        );
      }
      return;
    }
    case 'product':
      if (!block.productId?.trim()) {
        throw new ContentDomainError(
          `Product id required at ${path}.`,
          'CONTENT_BLOCK_INVALID',
        );
      }
      return;
    case 'offer':
      if (!block.offerId?.trim()) {
        throw new ContentDomainError(`Offer id required at ${path}.`, 'CONTENT_BLOCK_INVALID');
      }
      return;
    default: {
      const _exhaustive: never = block;
      throw new ContentDomainError(
        `Unknown leaf block at ${path}: ${JSON.stringify(_exhaustive)}`,
        'CONTENT_BLOCK_UNKNOWN',
      );
    }
  }
}

function isSection(block: ContentBlock): block is ContentSectionBlock {
  return block.type === 'section';
}

/**
 * Validates body tree. Sections may only contain leaf blocks (no nested sections).
 */
export function assertValidContentBody(body: readonly ContentBlock[]): void {
  body.forEach((block, index) => {
    const path = `body[${index}]`;
    if (isSection(block)) {
      if (![1, 2, 3].includes(block.columns)) {
        throw new ContentDomainError(
          `Section columns must be 1–3 at ${path}.`,
          'CONTENT_BLOCK_INVALID_SECTION',
        );
      }
      if (!Array.isArray(block.children) || block.children.length !== block.columns) {
        throw new ContentDomainError(
          `Section children length must equal columns at ${path}.`,
          'CONTENT_BLOCK_INVALID_SECTION',
        );
      }
      block.children.forEach((col, colIndex) => {
        if (!Array.isArray(col)) {
          throw new ContentDomainError(
            `Section column must be an array at ${path}.children[${colIndex}].`,
            'CONTENT_BLOCK_INVALID_SECTION',
          );
        }
        col.forEach((child, childIndex) => {
          const childPath = `${path}.children[${colIndex}][${childIndex}]`;
          if (!child || typeof child !== 'object' || !('type' in child)) {
            throw new ContentDomainError(`Invalid block at ${childPath}.`, 'CONTENT_BLOCK_INVALID');
          }
          if ((child as ContentBlock).type === 'section') {
            throw new ContentDomainError(
              `Nested sections are not allowed at ${childPath}.`,
              'CONTENT_BLOCK_NESTED_SECTION',
            );
          }
          assertLeaf(child as ContentLeafBlock, childPath);
        });
      });
      return;
    }
    if (!block || typeof block !== 'object' || !('type' in block)) {
      throw new ContentDomainError(`Invalid block at ${path}.`, 'CONTENT_BLOCK_INVALID');
    }
    assertLeaf(block, path);
  });
}

export function walkContentLeaves(
  body: readonly ContentBlock[],
): readonly ContentLeafBlock[] {
  const leaves: ContentLeafBlock[] = [];
  for (const block of body) {
    if (block.type === 'section') {
      for (const col of block.children) {
        leaves.push(...col);
      }
    } else {
      leaves.push(block);
    }
  }
  return leaves;
}
