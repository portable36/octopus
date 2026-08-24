export class FulfillmentDomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'FulfillmentDomainError';
  }
}

export class InvalidShipmentTransitionError extends FulfillmentDomainError {
  constructor(from: string, to: string) {
    super(`Cannot transition shipment from ${from} to ${to}.`, 'INVALID_SHIPMENT_TRANSITION');
  }
}

export class InvalidShipmentSnapshotError extends FulfillmentDomainError {
  constructor(message: string) {
    super(message, 'INVALID_SHIPMENT_SNAPSHOT');
  }
}
