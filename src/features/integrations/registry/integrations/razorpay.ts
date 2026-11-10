/**
 * Razorpay registry — full @corsair-dev/razorpay surface.
 */

import type { IntegrationDefinition } from "../types"

export const razorpayIntegrationDefinition: IntegrationDefinition = {
  typeKey: "razorpay",
  kind: "integration",
  corsairPluginId: "razorpay",
  label: "Razorpay",
  operations: [
    // orders
    {
      key: "orders.create",
      aliases: ["ORDER_CREATE"],
      label: "Create Order",
      group: "Orders",
      risk: "write",
    },
    {
      key: "orders.get",
      aliases: ["ORDER_FETCH"],
      label: "Fetch Order",
      group: "Orders",
      risk: "read",
    },
    {
      key: "orders.list",
      aliases: ["ORDER_LIST"],
      label: "List Orders",
      group: "Orders",
      risk: "read",
    },
    // payments
    {
      key: "payments.get",
      aliases: ["PAYMENT_FETCH"],
      label: "Fetch Payment",
      group: "Payments",
      risk: "read",
    },
    {
      key: "payments.list",
      aliases: ["PAYMENT_LIST"],
      label: "List Payments",
      group: "Payments",
      risk: "read",
    },
    {
      key: "payments.capture",
      aliases: ["PAYMENT_CAPTURE"],
      label: "Capture Payment",
      group: "Payments",
      risk: "write",
    },
    // refunds
    {
      key: "refunds.create",
      aliases: ["REFUND_CREATE"],
      label: "Create Refund",
      group: "Refunds",
      risk: "write",
    },
    {
      key: "refunds.get",
      aliases: ["REFUND_FETCH"],
      label: "Fetch Refund",
      group: "Refunds",
      risk: "read",
    },
    {
      key: "refunds.list",
      aliases: ["REFUND_LIST"],
      label: "List Refunds",
      group: "Refunds",
      risk: "read",
    },
    // customers
    {
      key: "customers.create",
      aliases: ["CUSTOMER_CREATE"],
      label: "Create Customer",
      group: "Customers",
      risk: "write",
    },
    {
      key: "customers.get",
      aliases: ["CUSTOMER_FETCH"],
      label: "Fetch Customer",
      group: "Customers",
      risk: "read",
    },
    {
      key: "customers.list",
      aliases: ["CUSTOMER_LIST"],
      label: "List Customers",
      group: "Customers",
      risk: "read",
    },
    {
      key: "customers.update",
      aliases: ["CUSTOMER_UPDATE"],
      label: "Update Customer",
      group: "Customers",
      risk: "write",
    },
    // payouts
    {
      key: "payouts.create",
      aliases: ["PAYOUT_CREATE"],
      label: "Create Payout",
      group: "Payouts",
      risk: "write",
    },
    {
      key: "payouts.get",
      aliases: ["PAYOUT_FETCH"],
      label: "Fetch Payout",
      group: "Payouts",
      risk: "read",
    },
    {
      key: "payouts.list",
      aliases: ["PAYOUT_LIST"],
      label: "List Payouts",
      group: "Payouts",
      risk: "read",
    },
    // settlements
    {
      key: "settlements.list",
      aliases: ["SETTLEMENT_LIST"],
      label: "List Settlements",
      group: "Settlements",
      risk: "read",
    },
    {
      key: "settlements.get",
      aliases: ["SETTLEMENT_FETCH"],
      label: "Fetch Settlement",
      group: "Settlements",
      risk: "read",
    },
    // subscriptions
    {
      key: "subscriptions.list",
      aliases: ["SUBSCRIPTION_LIST"],
      label: "List Subscriptions",
      group: "Subscriptions",
      risk: "read",
    },
    {
      key: "subscriptions.get",
      aliases: ["SUBSCRIPTION_FETCH"],
      label: "Fetch Subscription",
      group: "Subscriptions",
      risk: "read",
    },
    {
      key: "subscriptions.create",
      aliases: ["SUBSCRIPTION_CREATE"],
      label: "Create Subscription",
      group: "Subscriptions",
      risk: "write",
    },
    {
      key: "subscriptions.update",
      aliases: ["SUBSCRIPTION_UPDATE"],
      label: "Update Subscription",
      group: "Subscriptions",
      risk: "write",
    },
    {
      key: "subscriptions.cancel",
      aliases: ["SUBSCRIPTION_CANCEL"],
      label: "Cancel Subscription",
      group: "Subscriptions",
      risk: "destructive",
    },
    {
      key: "subscriptions.pause",
      aliases: ["SUBSCRIPTION_PAUSE"],
      label: "Pause Subscription",
      group: "Subscriptions",
      risk: "write",
    },
    {
      key: "subscriptions.resume",
      aliases: ["SUBSCRIPTION_RESUME"],
      label: "Resume Subscription",
      group: "Subscriptions",
      risk: "write",
    },
  ],
}
