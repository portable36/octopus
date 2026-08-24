export class MediaAccessDeniedError extends Error {
  readonly code = 'MEDIA_ACCESS_DENIED';
  constructor(message = 'Not authorized for media operations.') {
    super(message);
    this.name = 'MediaAccessDeniedError';
  }
}

export class MediaNotFoundError extends Error {
  readonly code = 'MEDIA_NOT_FOUND';
  constructor(message = 'Media asset was not found.') {
    super(message);
    this.name = 'MediaNotFoundError';
  }
}

export class MediaDomainError extends Error {
  readonly code: string;
  constructor(message: string, code = 'MEDIA_DOMAIN_ERROR') {
    super(message);
    this.name = 'MediaDomainError';
    this.code = code;
  }
}
