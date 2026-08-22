export interface DomainEvent {
  readonly eventName: string;
  readonly payload: Record<string, unknown>;
  readonly occurredAt: Date;
}

export abstract class AggregateRoot<ID> {
  private domainEvents: DomainEvent[] = [];

  constructor(public readonly id: ID) {}

  protected addEvent(eventName: string, payload: Record<string, unknown>): void {
    this.domainEvents.push({
      eventName,
      payload,
      occurredAt: new Date(),
    });
  }

  public getUncommittedEvents(): ReadonlyArray<DomainEvent> {
    return [...this.domainEvents];
  }

  public clearEvents(): void {
    this.domainEvents = [];
  }
}
