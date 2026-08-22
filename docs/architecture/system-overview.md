# System Overview

Multi-Vendor, Multi-Store E-Commerce Platform built as a modular monolith with Domain-Driven Design, Clean Architecture, and high-performance PostgreSQL.

## 1. Structural Decoupling Map

```text
                     [ Shared Event Bus (EventEmitter2) ]
                                      ▲
                                      │ (Async Events)
                                      ▼
+-----------------------+   +-----------------------+   +-----------------------+
|    Identity Module    |   |    Catalog Module     |   |     Order Module      |
|                       |   |                       |   |                       |
| - User Aggregate      |   | - Product Aggregate   |   | - Order Aggregate     |
| - Argon2id Security   |   | - JSONB Dynamic Attrib|   | - SubOrder Entities   |
| - Token Family Engine |   | - Syncs to Meili      |   | - Paisa Math Splitter |
+-----------------------+   +-----------------------+   +-----------------------+
            │                           │                           │
            +---------------------------+---------------------------+
                                        │
                                        ▼
                     [ Context Isolation / Postgres RLS ]
                                        │
                                        ▼
                     [ Shared Database / PgBouncer Proxy ]
```

## 2. Directory Layout & Bounded Contexts

Dependencies flow inward only:
`Infrastructure (Web/DB) -> Application (Use Cases/Commands) -> Domain (Aggregates/Value Objects)`

```text
src/
├── shared-kernel/            # Pure, zero-dependency DDD base primitives
│   ├── domain/               # Base Entity, ValueObject, AggregateRoot, UniqueID
│   └── infrastructure/       # Cross-cutting concerns (AsyncLocalStorage, Logger)
└── modules/
    ├── [context_name]/       # Bounded Context (e.g., identity, catalog, order)
    │   ├── domain/           # PURE DOMAIN LAYER (Zero external dependencies)
    │   │   ├── aggregates/   # Aggregate roots containing invariants
    │   │   ├── value-objects/# Immutable business attributes
    │   │   └── events/       # Native domain events
    │   ├── application/      # APPLICATION LAYER (NestJS & DB Agnostic)
    │   │   ├── commands/     # CQRS Write Use Cases
    │   │   ├── queries/      # CQRS Read Use Cases
    │   │   └── ports/        # Interfaces for repositories/services
    │   └── infrastructure/   # INFRASTRUCTURE LAYER
    │       ├── controllers/  # NestJS Controllers (v1 REST API)
    │       ├── persistence/  # MikroORM Schemas/Entities & Repository Adapters
    │       └── shared/       # Module specific wiring (NestJS Module definition)
```

Constraints:

- Domain code must be pure TypeScript: no `@nestjs/*`, no `mikro-orm`, no external packages.
- Modules never import across bounded contexts; communication happens exclusively via asynchronous Domain Events (`EventEmitter2`) or narrow application-layer contract interfaces.

## 3. Tenant Context Architecture

Context tracking uses NestJS interceptors over Node.js native execution tracking:

```typescript
// Location: src/shared-kernel/infrastructure/context/tenant-context.storage.ts
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  userId?: string;
  vendorId?: string;
  storeId?: string;
  correlationId: string;
}

export class TenantContextHolder {
  private static storage = new AsyncLocalStorage<TenantContext>();

  public static run(context: TenantContext, fn: () => void): void {
    this.storage.run(context, fn);
  }

  public static get(): TenantContext | undefined {
    return this.storage.getStore();
  }
}
```

`vendorId` and `storeId` are never passed as raw arguments through application use cases; they are resolved from the execution context.

## 4. Unified Cart Split-Payment Model

To support buying products across separate stores in a single checkout:

1. **Global Order**: tracks the customer's checkout identity, the unified payment provider context (`bKash`, `Nagad`, SSLCommerz), and the absolute checkout sum.
2. **SubOrder**: generated automatically per participating vendor. Holds independent status paths (`PENDING_FULFILLMENT`, `SHIPPED`), independent shipping tracker values, and calculation segments splitting items from platform commission shares.
