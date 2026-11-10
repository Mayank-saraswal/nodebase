import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  isStripeCorsairOp,
  runStripeOperation,
  type ResolvedStripeFields,
  type StripeApiClient,
} from "../operations"

function fields(
  overrides: Partial<ResolvedStripeFields> = {},
): ResolvedStripeFields {
  return {
    operation: "CUSTOMER_LIST",
    amount: "",
    currency: "usd",
    description: "",
    customerId: "",
    email: "",
    name: "",
    phone: "",
    chargeId: "",
    paymentIntentId: "",
    sourceId: "",
    source: "",
    paymentMethod: "",
    productId: "",
    productName: "",
    unitAmount: "",
    couponId: "",
    percentOff: "",
    amountOff: "",
    duration: "once",
    limit: "",
    startingAfter: "",
    endingBefore: "",
    metadataJson: "",
    paramsJson: "",
    confirm: false,
    cardNumber: "",
    expMonth: "",
    expYear: "",
    cvc: "",
    ...overrides,
  }
}

function mockClient(): StripeApiClient {
  const ok = (extra: Record<string, unknown> = {}) =>
    vi.fn().mockResolvedValue({ id: "obj_1", ...extra })
  return {
    stripe: {
      api: {
        balance: { get: ok({ available: [] }) },
        charges: {
          create: ok({ amount: 100, currency: "usd" }),
          get: ok(),
          list: vi.fn().mockResolvedValue({ data: [] }),
          update: ok(),
        },
        coupons: {
          create: ok(),
          list: vi.fn().mockResolvedValue({ data: [] }),
        },
        customers: {
          create: ok(),
          delete: ok({ deleted: true }),
          get: ok(),
          list: vi.fn().mockResolvedValue({ data: [] }),
        },
        paymentIntents: {
          create: ok({ client_secret: "sec" }),
          get: ok(),
          list: vi.fn().mockResolvedValue({ data: [] }),
          update: ok(),
        },
        prices: {
          create: ok(),
          list: vi.fn().mockResolvedValue({ data: [] }),
        },
        sources: {
          create: ok(),
          get: ok(),
        },
        tokens: {
          create: ok(),
        },
      },
    },
  }
}

describe("runStripeOperation (full Corsair surface + edges)", () => {
  let client: StripeApiClient

  beforeEach(() => {
    client = mockClient()
  })

  it("BALANCE_GET", async () => {
    const out = await runStripeOperation(
      client,
      fields({ operation: "BALANCE_GET" }),
    )
    expect(client.stripe.api.balance.get).toHaveBeenCalled()
    expect(out.operation).toBe("BALANCE_GET")
  })

  it("CHARGE_CREATE requires amount and source/customer", async () => {
    await expect(
      runStripeOperation(client, fields({ operation: "CHARGE_CREATE" })),
    ).rejects.toThrow(/amount/)
    await expect(
      runStripeOperation(
        client,
        fields({ operation: "CHARGE_CREATE", amount: "100" }),
      ),
    ).rejects.toThrow(/source or customerId/)
  })

  it("CHARGE_CREATE", async () => {
    await runStripeOperation(
      client,
      fields({
        operation: "CHARGE_CREATE",
        amount: "500",
        source: "tok_visa",
        description: "test",
      }),
    )
    expect(client.stripe.api.charges.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 500,
        currency: "usd",
        source: "tok_visa",
      }),
    )
  })

  it("CHARGE_GET requires chargeId", async () => {
    await expect(
      runStripeOperation(client, fields({ operation: "CHARGE_GET" })),
    ).rejects.toThrow(/chargeId/)
  })

  it("covers charge list/update", async () => {
    await runStripeOperation(client, fields({ operation: "CHARGE_LIST" }))
    await runStripeOperation(
      client,
      fields({ operation: "CHARGE_UPDATE", chargeId: "ch_1" }),
    )
    expect(client.stripe.api.charges.list).toHaveBeenCalled()
    expect(client.stripe.api.charges.update).toHaveBeenCalled()
  })

  it("COUPON_CREATE requires percent or amount off", async () => {
    await expect(
      runStripeOperation(client, fields({ operation: "COUPON_CREATE" })),
    ).rejects.toThrow(/percentOff or amountOff/)
  })

  it("COUPON_CREATE + LIST", async () => {
    await runStripeOperation(
      client,
      fields({ operation: "COUPON_CREATE", percentOff: "10" }),
    )
    await runStripeOperation(client, fields({ operation: "COUPON_LIST" }))
    expect(client.stripe.api.coupons.create).toHaveBeenCalled()
    expect(client.stripe.api.coupons.list).toHaveBeenCalled()
  })

  it("customer CRUD + edges", async () => {
    await runStripeOperation(
      client,
      fields({
        operation: "CUSTOMER_CREATE",
        email: "a@b.c",
        name: "Ada",
      }),
    )
    await expect(
      runStripeOperation(client, fields({ operation: "CUSTOMER_GET" })),
    ).rejects.toThrow(/customerId/)
    await runStripeOperation(
      client,
      fields({ operation: "CUSTOMER_GET", customerId: "cus_1" }),
    )
    await runStripeOperation(client, fields({ operation: "CUSTOMER_LIST" }))
    await runStripeOperation(
      client,
      fields({ operation: "CUSTOMER_DELETE", customerId: "cus_1" }),
    )
    expect(client.stripe.api.customers.create).toHaveBeenCalled()
    expect(client.stripe.api.customers.delete).toHaveBeenCalled()
  })

  it("payment intents", async () => {
    await expect(
      runStripeOperation(
        client,
        fields({ operation: "PAYMENT_INTENT_CREATE" }),
      ),
    ).rejects.toThrow(/amount/)
    await runStripeOperation(
      client,
      fields({
        operation: "PAYMENT_INTENT_CREATE",
        amount: "1000",
        currency: "eur",
      }),
    )
    await runStripeOperation(
      client,
      fields({
        operation: "PAYMENT_INTENT_GET",
        paymentIntentId: "pi_1",
      }),
    )
    await runStripeOperation(
      client,
      fields({ operation: "PAYMENT_INTENT_LIST" }),
    )
    await runStripeOperation(
      client,
      fields({
        operation: "PAYMENT_INTENT_UPDATE",
        paymentIntentId: "pi_1",
        description: "upd",
      }),
    )
    expect(client.stripe.api.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1000, currency: "eur" }),
    )
  })

  it("PRICE_CREATE requires product", async () => {
    await expect(
      runStripeOperation(
        client,
        fields({ operation: "PRICE_CREATE", unitAmount: "100" }),
      ),
    ).rejects.toThrow(/productId or productName/)
  })

  it("prices + sources + tokens", async () => {
    await runStripeOperation(
      client,
      fields({
        operation: "PRICE_CREATE",
        productName: "Pro",
        unitAmount: "999",
      }),
    )
    await runStripeOperation(client, fields({ operation: "PRICE_LIST" }))
    await runStripeOperation(
      client,
      fields({ operation: "SOURCE_CREATE", paramsJson: '{"type":"card"}' }),
    )
    await expect(
      runStripeOperation(client, fields({ operation: "SOURCE_GET" })),
    ).rejects.toThrow(/sourceId/)
    await runStripeOperation(
      client,
      fields({ operation: "SOURCE_GET", sourceId: "src_1" }),
    )
    await expect(
      runStripeOperation(client, fields({ operation: "TOKEN_CREATE" })),
    ).rejects.toThrow(/card fields or paramsJson/)
    await runStripeOperation(
      client,
      fields({
        operation: "TOKEN_CREATE",
        cardNumber: "4242424242424242",
        expMonth: "12",
        expYear: "2030",
        cvc: "123",
      }),
    )
    expect(client.stripe.api.prices.create).toHaveBeenCalled()
    expect(client.stripe.api.tokens.create).toHaveBeenCalled()
  })

  it("invalid metadata / params JSON", async () => {
    await expect(
      runStripeOperation(
        client,
        fields({
          operation: "CUSTOMER_CREATE",
          metadataJson: "not-json",
        }),
      ),
    ).rejects.toThrow(/JSON/)
    await expect(
      runStripeOperation(
        client,
        fields({
          operation: "CUSTOMER_CREATE",
          paramsJson: "[]",
        }),
      ),
    ).rejects.toThrow(/object/)
  })

  it("accepts Corsair path keys", async () => {
    const out = await runStripeOperation(
      client,
      fields({ operation: "customers.list" }),
    )
    expect(out.operation).toBe("CUSTOMER_LIST")
  })

  it("isStripeCorsairOp", () => {
    expect(isStripeCorsairOp("CHARGE_CREATE")).toBe(true)
    expect(isStripeCorsairOp("paymentIntents.create")).toBe(true)
    expect(isStripeCorsairOp("NOPE")).toBe(false)
  })
})
