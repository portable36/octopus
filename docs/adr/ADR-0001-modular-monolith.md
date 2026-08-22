# ADR-0001: Modular Monolith

## Status

Accepted

## Context

The platform requires strong domain boundaries, transactional consistency, rapid development, and a future migration path to services.

## Decision

Use a modular monolith with DDD bounded contexts and explicit module contracts.

Modules share one deployable application but do not share internal implementation details.

## Consequences

Positive:

- simple deployment
- strong local transactions
- lower operational complexity
- explicit domain ownership
- easier future extraction

Negative:

- requires discipline
- module boundaries must be tested
- shared database creates potential coupling

## Extraction rule

A module is a candidate for extraction only when:

- its contracts are explicit
- its persistence ownership is clear
- asynchronous boundaries are defined where needed
- observability is sufficient
- operational ownership is understood
