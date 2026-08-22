import { EventSubscriber, type EntityManager, type TransactionEventArgs } from '@mikro-orm/core';
import { applyRlsSessionVariables } from './rls-session';

/** Applies RLS session variables at transaction start for every MikroORM transaction. */
export class RlsContextSubscriber implements EventSubscriber {
  async afterTransactionStart(args: TransactionEventArgs): Promise<void> {
    const em = args.em as EntityManager;
    await applyRlsSessionVariables(em);
  }
}
