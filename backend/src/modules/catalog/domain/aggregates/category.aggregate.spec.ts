import { describe, expect, it } from 'vitest';
import { CategoryCycleError } from '../errors/catalog.errors';
import { Category } from './category.aggregate';

describe('Category', () => {
  it('creates an active category with slug and SEO', () => {
    const category = Category.create({
      name: 'Electronics',
      seoTitle: 'Electronics',
      seoDescription: 'Devices and gadgets',
    });
    expect(category.status).toBe('active');
    expect(category.slug).toBe('electronics');
    expect(category.seo.title).toBe('Electronics');
    expect(category.getUncommittedEvents().map((e) => e.eventName)).toContain('CategoryCreated');
  });

  it('rejects moving a category under itself', () => {
    const category = Category.create({ name: 'Phones' });
    expect(() => category.moveTo(category.id.value, [])).toThrow(CategoryCycleError);
  });

  it('archives a category', () => {
    const category = Category.create({ name: 'Accessories' });
    category.archive();
    expect(category.status).toBe('archived');
    expect(() => category.rename('Other')).toThrow('Archived categories cannot be mutated');
  });
});
