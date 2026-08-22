# Customer Module

## Responsibility

The Customer Experience bounded context owns customer profile, addresses, wishlists, order history views, and preference settings distinct from Identity credentials.

Customer owns:

- Customer profile aggregate linked to Identity User ID
- Saved shipping/billing addresses
- Wishlist and recently viewed (where productized)
- Notification and marketing preferences
- Customer-facing order history projections (via Order read ports)

Customer does not own:

- Authentication secrets (Identity module)
- Order mutation or payment (Order/Payment modules)

## Privacy

- Export and deletion requests coordinated with Identity and Audit
- PII minimization in logs
- Address validation at application boundary

## Testing requirements

- Customer A cannot read Customer B profile or addresses
- Address CRUD authorization
- Preference changes affect Notification routing

## Exit criteria

- Profile linked 1:1 with Identity user for registered customers
- Address book integrated with Checkout

## Related

- [PHASES.md](../PHASES.md) — Phase 18
- [Identity Module](./identity.md)
- [Checkout Module](./checkout.md)
