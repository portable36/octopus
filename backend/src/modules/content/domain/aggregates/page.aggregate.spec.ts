import { describe, expect, it } from 'vitest';
import { Page } from './page.aggregate';
import { ContentDomainError, ContentPageVersionConflictError } from '../errors/content.errors';

describe('Page aggregate', () => {
  it('create starts as DRAFT version 1', () => {
    const page = Page.create({
      title: 'About',
      slug: 'about',
      body: [{ type: 'paragraph', text: 'Hello' }],
      actorUserId: 'actor-1',
    });
    expect(page.status).toBe('DRAFT');
    expect(page.version).toBe(1);
    expect(page.currentPublicationId).toBeNull();
  });

  it('updateDraft bumps version without publishing', () => {
    const page = Page.create({
      title: 'About',
      slug: 'about',
      body: [{ type: 'paragraph', text: 'Hello' }],
      actorUserId: null,
    });
    page.updateDraft({
      expectedVersion: 1,
      body: [{ type: 'paragraph', text: 'Updated' }],
      actorUserId: null,
    });
    expect(page.status).toBe('DRAFT');
    expect(page.version).toBe(2);
    expect(page.draftBody).toEqual([{ type: 'paragraph', text: 'Updated' }]);
    expect(page.currentPublicationId).toBeNull();
  });

  it('publish rejects empty body', () => {
    const page = Page.create({
      title: 'Empty',
      slug: 'empty',
      body: [],
      actorUserId: null,
    });
    expect(() => page.publish({ expectedVersion: 1, actorUserId: null })).toThrowError(
      ContentDomainError,
    );
  });

  it('stale expectedVersion conflicts on update and publish', () => {
    const page = Page.create({
      title: 'About',
      slug: 'about',
      body: [{ type: 'paragraph', text: 'Hello' }],
      actorUserId: null,
    });
    expect(() =>
      page.updateDraft({ expectedVersion: 99, title: 'Nope', actorUserId: null }),
    ).toThrowError(ContentPageVersionConflictError);

    page.updateDraft({
      expectedVersion: 1,
      title: 'About us',
      actorUserId: null,
    });
    expect(() => page.publish({ expectedVersion: 1, actorUserId: null })).toThrowError(
      ContentPageVersionConflictError,
    );
  });

  it('publish then unpublish clears current publication', () => {
    const page = Page.create({
      title: 'About',
      slug: 'about',
      body: [{ type: 'paragraph', text: 'Hello' }],
      actorUserId: 'a1',
    });
    const pub = page.publish({ expectedVersion: 1, actorUserId: 'a1' });
    expect(page.status).toBe('PUBLISHED');
    expect(page.currentPublicationId).toBe(pub.id);
    expect(page.version).toBe(2);

    page.unpublish({ expectedVersion: 2, actorUserId: 'a1' });
    expect(page.status).toBe('UNPUBLISHED');
    expect(page.currentPublicationId).toBeNull();
    expect(page.draftBody).toEqual([{ type: 'paragraph', text: 'Hello' }]);
  });
});
