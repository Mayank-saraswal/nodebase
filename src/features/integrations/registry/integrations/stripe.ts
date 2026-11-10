/**
 * Stripe registry — full @corsair-dev/stripe surface (20 endpoints).
 * Generated from package nested endpoint tree.
 */

import type { IntegrationDefinition, OperationDefinition } from "../types"

export const STRIPE_CORSAIR_ENDPOINTS = [
  "balance.get",
  "charges.create",
  "charges.get",
  "charges.list",
  "charges.update",
  "coupons.create",
  "coupons.list",
  "customers.create",
  "customers.delete",
  "customers.get",
  "customers.list",
  "paymentIntents.create",
  "paymentIntents.get",
  "paymentIntents.list",
  "paymentIntents.update",
  "prices.create",
  "prices.list",
  "sources.create",
  "sources.get",
  "tokens.create"
] as const

const OPERATIONS: OperationDefinition[] = [
  {
    "key": "balance.get",
    "aliases": [
      "BALANCE_GET",
      "GET_BALANCE"
    ],
    "label": "balance.get",
    "group": "balance",
    "risk": "read"
  },
  {
    "key": "charges.create",
    "aliases": [
      "CHARGE_CREATE",
      "CREATE_CHARGE"
    ],
    "label": "charges.create",
    "group": "charges",
    "risk": "write"
  },
  {
    "key": "charges.get",
    "aliases": [
      "CHARGE_GET",
      "GET_CHARGE"
    ],
    "label": "charges.get",
    "group": "charges",
    "risk": "read"
  },
  {
    "key": "charges.list",
    "aliases": [
      "CHARGE_LIST",
      "LIST_CHARGES"
    ],
    "label": "charges.list",
    "group": "charges",
    "risk": "read"
  },
  {
    "key": "charges.update",
    "aliases": [
      "CHARGE_UPDATE",
      "UPDATE_CHARGE"
    ],
    "label": "charges.update",
    "group": "charges",
    "risk": "write"
  },
  {
    "key": "coupons.create",
    "aliases": [
      "COUPON_CREATE",
      "CREATE_COUPON"
    ],
    "label": "coupons.create",
    "group": "coupons",
    "risk": "write"
  },
  {
    "key": "coupons.list",
    "aliases": [
      "COUPON_LIST",
      "LIST_COUPONS"
    ],
    "label": "coupons.list",
    "group": "coupons",
    "risk": "read"
  },
  {
    "key": "customers.create",
    "aliases": [
      "CUSTOMER_CREATE",
      "CREATE_CUSTOMER"
    ],
    "label": "customers.create",
    "group": "customers",
    "risk": "write"
  },
  {
    "key": "customers.delete",
    "aliases": [
      "CUSTOMER_DELETE",
      "DELETE_CUSTOMER"
    ],
    "label": "customers.delete",
    "group": "customers",
    "risk": "destructive"
  },
  {
    "key": "customers.get",
    "aliases": [
      "CUSTOMER_GET",
      "GET_CUSTOMER"
    ],
    "label": "customers.get",
    "group": "customers",
    "risk": "read"
  },
  {
    "key": "customers.list",
    "aliases": [
      "CUSTOMER_LIST",
      "LIST_CUSTOMERS"
    ],
    "label": "customers.list",
    "group": "customers",
    "risk": "read"
  },
  {
    "key": "paymentIntents.create",
    "aliases": [
      "PAYMENT_INTENT_CREATE",
      "CREATE_PAYMENT_INTENT"
    ],
    "label": "paymentIntents.create",
    "group": "paymentIntents",
    "risk": "write"
  },
  {
    "key": "paymentIntents.get",
    "aliases": [
      "PAYMENT_INTENT_GET",
      "GET_PAYMENT_INTENT"
    ],
    "label": "paymentIntents.get",
    "group": "paymentIntents",
    "risk": "read"
  },
  {
    "key": "paymentIntents.list",
    "aliases": [
      "PAYMENT_INTENT_LIST",
      "LIST_PAYMENT_INTENTS"
    ],
    "label": "paymentIntents.list",
    "group": "paymentIntents",
    "risk": "read"
  },
  {
    "key": "paymentIntents.update",
    "aliases": [
      "PAYMENT_INTENT_UPDATE",
      "UPDATE_PAYMENT_INTENT"
    ],
    "label": "paymentIntents.update",
    "group": "paymentIntents",
    "risk": "write"
  },
  {
    "key": "prices.create",
    "aliases": [
      "PRICE_CREATE",
      "CREATE_PRICE"
    ],
    "label": "prices.create",
    "group": "prices",
    "risk": "write"
  },
  {
    "key": "prices.list",
    "aliases": [
      "PRICE_LIST",
      "LIST_PRICES"
    ],
    "label": "prices.list",
    "group": "prices",
    "risk": "read"
  },
  {
    "key": "sources.create",
    "aliases": [
      "SOURCE_CREATE",
      "CREATE_SOURCE"
    ],
    "label": "sources.create",
    "group": "sources",
    "risk": "write"
  },
  {
    "key": "sources.get",
    "aliases": [
      "SOURCE_GET",
      "GET_SOURCE"
    ],
    "label": "sources.get",
    "group": "sources",
    "risk": "read"
  },
  {
    "key": "tokens.create",
    "aliases": [
      "TOKEN_CREATE",
      "CREATE_TOKEN"
    ],
    "label": "tokens.create",
    "group": "tokens",
    "risk": "write"
  }
] as OperationDefinition[]

export const stripeIntegrationDefinition: IntegrationDefinition = {
  typeKey: "stripe",
  kind: "integration",
  corsairPluginId: "stripe",
  label: "Stripe",
  operations: OPERATIONS,
}
