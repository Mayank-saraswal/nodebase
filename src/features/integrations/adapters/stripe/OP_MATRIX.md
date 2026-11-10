# Stripe operation matrix (Nodebase → Corsair)

Source: `@corsair-dev/stripe` (`stripe.api.*`) — **20 endpoints**.

| Group | Endpoints | Aliases |
|-------|-----------|---------|
| balance | get | BALANCE_GET |
| charges | create, get, list, update | CHARGE_* |
| coupons | create, list | COUPON_* |
| customers | create, delete, get, list | CUSTOMER_* |
| paymentIntents | create, get, list, update | PAYMENT_INTENT_* |
| prices | create, list | PRICE_* |
| sources | create, get | SOURCE_* |
| tokens | create | TOKEN_CREATE |

Amounts are **cents**. Completeness test asserts registry ⊇ all nested endpoints.

Note: product currently has `STRIPE_TRIGGER` only; action ops run via Corsair adapter (`typeKey: stripe`).
