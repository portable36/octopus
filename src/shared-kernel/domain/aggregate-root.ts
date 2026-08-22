import { UniqueId } from './unique-id.value-object';

export abstract class AggregateRoot {
  protected readonly _id: UniqueId;
  private _domainEvents: any[] = [];

  protected constructor(id?: UniqueId) {
    this._id = id ?? UniqueId.create();
  }

  get id(): UniqueId {
    return this._id;
  }

  get domainEvents(): any[] {
    return [...this._domainEvents];
  }

  protected addDomainEvent(event: any): void {
    this._domainEvents.push(event);
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
