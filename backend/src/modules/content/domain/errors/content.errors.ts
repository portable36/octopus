export class ContentDomainError extends Error {
  readonly code: string;

  constructor(message: string, code = 'CONTENT_DOMAIN_ERROR') {
    super(message);
    this.name = 'ContentDomainError';
    this.code = code;
  }
}

export class ContentPageNotFoundError extends Error {
  readonly code = 'CONTENT_PAGE_NOT_FOUND';

  constructor(message = 'Content page was not found.') {
    super(message);
    this.name = 'ContentPageNotFoundError';
  }
}

export class ContentPageVersionConflictError extends ContentDomainError {
  constructor(message = 'Content page version conflict.') {
    super(message, 'CONTENT_PAGE_VERSION_CONFLICT');
    this.name = 'ContentPageVersionConflictError';
  }
}

export class ContentPageSlugConflictError extends ContentDomainError {
  constructor(message = 'Content page slug is already in use.') {
    super(message, 'CONTENT_PAGE_SLUG_CONFLICT');
    this.name = 'ContentPageSlugConflictError';
  }
}

export class ContentPageMediaNotReadyError extends ContentDomainError {
  constructor(message = 'Referenced media is missing or not ready for publish.') {
    super(message, 'CONTENT_PAGE_MEDIA_NOT_READY');
    this.name = 'ContentPageMediaNotReadyError';
  }
}

export class ContentPagePublicationNotFoundError extends Error {
  readonly code = 'CONTENT_PAGE_PUBLICATION_NOT_FOUND';

  constructor(message = 'Content page publication was not found.') {
    super(message);
    this.name = 'ContentPagePublicationNotFoundError';
  }
}
