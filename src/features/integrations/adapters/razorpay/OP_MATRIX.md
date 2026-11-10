# Razorpay operation matrix (Nodebase → Corsair)

Source: `@corsair-dev/razorpay` (`razorpay.api.*`).

| Group | Corsair endpoints | Product aliases |
|-------|-------------------|-----------------|
| Orders | create, get, list | ORDER_CREATE, ORDER_FETCH, ORDER_LIST |
| Payments | get, list, capture | PAYMENT_FETCH, PAYMENT_LIST, PAYMENT_CAPTURE |
| Refunds | create, get, list | REFUND_CREATE, REFUND_FETCH, REFUND_LIST |
| Customers | create, get, list, update | CUSTOMER_* |
| Payouts | create, get, list | PAYOUT_CREATE, PAYOUT_FETCH, PAYOUT_LIST |
| Settlements | list, get | SETTLEMENT_LIST, SETTLEMENT_FETCH |
| Subscriptions | list, get, create, update, cancel, pause, resume | SUBSCRIPTION_* |

Completeness test asserts registry ⊇ all nested endpoints above.

**Legacy-only** (not in package): ORDER_FETCH_PAYMENTS, PAYMENT_UPDATE, invoices, payment links, VERIFY_PAYMENT_SIGNATURE — dual-path falls to native REST executor.

Amounts are **paise** (e.g. `50000` = ₹500).
