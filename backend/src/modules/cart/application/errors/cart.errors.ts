export class CartAccessDeniedError extends Error {
  readonly code = 'CART_ACCESS_DENIED';
  constructor() {
    super('Cart access denied.');
    this.name = 'CartAccessDeniedError';
  }
}

export class CartNotFoundError extends Error {
  readonly code = 'CART_NOT_FOUND';
  constructor() {
    super('Cart was not found.');
    this.name = 'CartNotFoundError';
  }
}

export class CartOfferUnavailableError extends Error {
  readonly code = 'CART_OFFER_UNAVAILABLE';
  constructor(message = 'Store offer is missing or not sellable.') {
    super(message);
    this.name = 'CartOfferUnavailableError';
  }
}
