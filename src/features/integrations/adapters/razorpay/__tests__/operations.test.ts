import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  isRazorpayCorsairOp,
  runRazorpayOperation,
  type RazorpayApiClient,
  type ResolvedRazorpayFields,
} from "../operations"

function fields(
  overrides: Partial<ResolvedRazorpayFields> = {},
): ResolvedRazorpayFields {
  return {
    operation: "ORDER_CREATE",
    amount: "50000",
    currency: "INR",
    receipt: "rcpt_1",
    notesJson: "",
    orderId: "",
    paymentId: "",
    refundId: "",
    customerId: "",
    customerName: "",
    customerEmail: "",
    customerContact: "",
    gstin: "",
    captureAmount: "",
    refundAmount: "",
    refundSpeed: "normal",
    planId: "",
    totalCount: "",
    quantity: "",
    startAt: "",
    subscriptionId: "",
    cancelAtCycleEnd: false,
    remainingCount: "",
    scheduleChangeAt: "",
    accountNumber: "",
    fundAccountId: "",
    payoutMode: "",
    payoutPurpose: "payout",
    narration: "",
    referenceId: "",
    queueIfLowBalance: false,
    payoutId: "",
    settlementId: "",
    count: "",
    skip: "",
    fromDate: "",
    toDate: "",
    authorized: "",
    offerId: "",
    ...overrides,
  }
}

function mockClient(): RazorpayApiClient {
  const ok = (extra: Record<string, unknown> = {}) =>
    vi.fn().mockResolvedValue({ id: "1", amount: 50000, ...extra })
  return {
    razorpay: {
      api: {
        orders: {
          create: ok(),
          get: ok(),
          list: vi.fn().mockResolvedValue({ items: [] }),
        },
        payments: {
          get: ok(),
          list: vi.fn().mockResolvedValue({ items: [] }),
          capture: ok(),
        },
        payouts: {
          get: ok(),
          list: vi.fn().mockResolvedValue({ items: [] }),
          create: ok(),
        },
        refunds: {
          create: ok(),
          get: ok(),
          list: vi.fn().mockResolvedValue({ items: [] }),
        },
        customers: {
          create: ok(),
          get: ok(),
          list: vi.fn().mockResolvedValue({ items: [] }),
          update: ok(),
        },
        settlements: {
          list: vi.fn().mockResolvedValue({ items: [] }),
          get: ok(),
        },
        subscriptions: {
          list: vi.fn().mockResolvedValue({ items: [] }),
          get: ok(),
          create: ok(),
          update: ok(),
          cancel: ok(),
          pause: ok(),
          resume: ok(),
        },
      },
    },
  }
}

describe("runRazorpayOperation (full Corsair surface)", () => {
  let client: RazorpayApiClient

  beforeEach(() => {
    client = mockClient()
  })

  it("ORDER_CREATE", async () => {
    const out = await runRazorpayOperation(client, fields())
    expect(client.razorpay.api.orders.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 50000,
        currency: "INR",
        receipt: "rcpt_1",
      }),
    )
    expect(out.operation).toBe("ORDER_CREATE")
    expect(out.amountInRupees).toBe(500)
  })

  it("ORDER_CREATE requires amount", async () => {
    await expect(
      runRazorpayOperation(client, fields({ amount: "" })),
    ).rejects.toThrow(/amount/)
  })

  it("ORDER_FETCH requires orderId", async () => {
    await expect(
      runRazorpayOperation(client, fields({ operation: "ORDER_FETCH" })),
    ).rejects.toThrow(/orderId/)
  })

  it("PAYMENT_CAPTURE", async () => {
    await runRazorpayOperation(
      client,
      fields({
        operation: "PAYMENT_CAPTURE",
        paymentId: "pay_1",
        captureAmount: "1000",
      }),
    )
    expect(client.razorpay.api.payments.capture).toHaveBeenCalledWith(
      expect.objectContaining({ id: "pay_1", amount: 1000 }),
    )
  })

  it("REFUND_CREATE requires paymentId", async () => {
    await expect(
      runRazorpayOperation(client, fields({ operation: "REFUND_CREATE" })),
    ).rejects.toThrow(/paymentId/)
  })

  it("CUSTOMER_CREATE requires name", async () => {
    await expect(
      runRazorpayOperation(client, fields({ operation: "CUSTOMER_CREATE" })),
    ).rejects.toThrow(/customerName/)
  })

  it("CUSTOMER_CREATE", async () => {
    await runRazorpayOperation(
      client,
      fields({
        operation: "CUSTOMER_CREATE",
        customerName: "Ada",
        customerEmail: "a@b.c",
      }),
    )
    expect(client.razorpay.api.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ada", email: "a@b.c" }),
    )
  })

  it("PAYOUT_CREATE requires fields", async () => {
    await expect(
      runRazorpayOperation(client, fields({ operation: "PAYOUT_CREATE" })),
    ).rejects.toThrow(/accountNumber/)
  })

  it("PAYOUT_CREATE", async () => {
    await runRazorpayOperation(
      client,
      fields({
        operation: "PAYOUT_CREATE",
        accountNumber: "acc",
        fundAccountId: "fa",
        payoutMode: "IMPS",
        amount: "100",
      }),
    )
    expect(client.razorpay.api.payouts.create).toHaveBeenCalled()
  })

  it("SUBSCRIPTION_CREATE requires plan and totalCount", async () => {
    await expect(
      runRazorpayOperation(
        client,
        fields({ operation: "SUBSCRIPTION_CREATE", planId: "plan_1" }),
      ),
    ).rejects.toThrow(/totalCount/)
  })

  it("subscription lifecycle", async () => {
    await runRazorpayOperation(
      client,
      fields({
        operation: "SUBSCRIPTION_CREATE",
        planId: "plan_1",
        totalCount: "12",
      }),
    )
    await runRazorpayOperation(
      client,
      fields({
        operation: "SUBSCRIPTION_PAUSE",
        subscriptionId: "sub_1",
      }),
    )
    await runRazorpayOperation(
      client,
      fields({
        operation: "SUBSCRIPTION_RESUME",
        subscriptionId: "sub_1",
      }),
    )
    await runRazorpayOperation(
      client,
      fields({
        operation: "SUBSCRIPTION_CANCEL",
        subscriptionId: "sub_1",
      }),
    )
    expect(client.razorpay.api.subscriptions.create).toHaveBeenCalled()
    expect(client.razorpay.api.subscriptions.pause).toHaveBeenCalled()
    expect(client.razorpay.api.subscriptions.resume).toHaveBeenCalled()
    expect(client.razorpay.api.subscriptions.cancel).toHaveBeenCalled()
  })

  it("SETTLEMENT_FETCH requires settlementId", async () => {
    await expect(
      runRazorpayOperation(client, fields({ operation: "SETTLEMENT_FETCH" })),
    ).rejects.toThrow(/settlementId/)
  })

  it("list endpoints", async () => {
    await runRazorpayOperation(client, fields({ operation: "ORDER_LIST" }))
    await runRazorpayOperation(client, fields({ operation: "PAYMENT_LIST" }))
    await runRazorpayOperation(client, fields({ operation: "CUSTOMER_LIST" }))
    await runRazorpayOperation(
      client,
      fields({ operation: "SETTLEMENT_LIST" }),
    )
    expect(client.razorpay.api.orders.list).toHaveBeenCalled()
    expect(client.razorpay.api.payments.list).toHaveBeenCalled()
    expect(client.razorpay.api.customers.list).toHaveBeenCalled()
    expect(client.razorpay.api.settlements.list).toHaveBeenCalled()
  })

  it("invalid notes JSON", async () => {
    await expect(
      runRazorpayOperation(client, fields({ notesJson: "not-json" })),
    ).rejects.toThrow(/JSON/)
  })

  it("accepts Corsair path keys", async () => {
    const out = await runRazorpayOperation(
      client,
      fields({ operation: "orders.create" }),
    )
    expect(out.operation).toBe("ORDER_CREATE")
  })

  it("isRazorpayCorsairOp", () => {
    expect(isRazorpayCorsairOp("ORDER_CREATE")).toBe(true)
    expect(isRazorpayCorsairOp("SUBSCRIPTION_PAUSE")).toBe(true)
    expect(isRazorpayCorsairOp("VERIFY_PAYMENT_SIGNATURE")).toBe(false)
    expect(isRazorpayCorsairOp("INVOICE_CREATE")).toBe(false)
  })
})
