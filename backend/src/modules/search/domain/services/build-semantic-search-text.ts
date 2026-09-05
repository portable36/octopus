import {
  compileSearchAttributes,
  type SearchAttributeAssignment,
} from './compile-search-attributes';
import { stripHtmlForSearch } from './strip-html-for-search';

export type SemanticSearchInput = {
  readonly name: string;
  readonly variantName?: string | null;
  readonly categoryNames?: readonly string[];
  readonly shortDescription?: string | null;
  readonly productAttributes?: readonly SearchAttributeAssignment[];
  readonly variantAttributes?: readonly SearchAttributeAssignment[];
  readonly reviewTexts?: readonly string[];
};

/** Aggregate product facets into a single clean semantic text block for vector / full-text search. */
export function buildSemanticSearchText(input: SemanticSearchInput): string {
  const sections: string[] = [];

  const name = input.name.trim();
  if (name) {
    sections.push(name);
  }

  const variantName = input.variantName?.trim();
  if (variantName && variantName !== name) {
    sections.push(variantName);
  }

  const categories = (input.categoryNames ?? [])
    .map((category) => category.trim())
    .filter((category) => category.length > 0);
  if (categories.length > 0) {
    sections.push(`Categories: ${categories.join(', ')}`);
  }

  const description = stripHtmlForSearch(input.shortDescription);
  if (description) {
    sections.push(description);
  }

  const attributeTokens = [
    ...compileSearchAttributes(input.productAttributes ?? []),
    ...compileSearchAttributes(input.variantAttributes ?? []),
  ];
  if (attributeTokens.length > 0) {
    sections.push(`Attributes: ${attributeTokens.join('; ')}`);
  }

  const reviews = (input.reviewTexts ?? [])
    .map((review) => stripHtmlForSearch(review))
    .filter((review) => review.length > 0);
  if (reviews.length > 0) {
    sections.push(`Reviews: ${reviews.join(' | ')}`);
  }

  return sections.join('\n').replace(/\s+/g, ' ').trim();
}
