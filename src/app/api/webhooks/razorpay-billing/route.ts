import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/db"

function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex")

    if (expected.length !== signature.length) return false

    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    )
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET not set")
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 })
  }

  const signature = req.headers.get("x-razorpay-signature") || ""
  const rawBody = await req.text()

  // ── Verify signature — CRITICAL security check ──────────────────────────
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    console.error("Razorpay webhook: Invalid signature")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const eventType = event.event as string
  const payload = event.payload as Record<string, unknown>

  console.log(`Razorpay billing webhook received: ${eventType}`)

  try {
    switch (eventType) {
      // ── Subscription activated (first payment succeeded) ─────────────────
      case "subscription.activated": {
        const sub = (
          payload.subscription as Record<string, unknown>
        )?.entity as Record<string, unknown>
        const subId = sub?.id as string
        const notes = sub?.notes as Record<string, string>
        const userId = notes?.userId

        if (!userId) {
          console.error("subscription.activated: no userId in notes")
          break
        }

        const plan = (notes?.plan || "FREE") as string
        const periodEnd = sub?.current_end
          ? new Date((sub.current_end as number) * 1000)
          : null

        await prisma.user.update({
          where: { id: userId },
          data: {
            plan,
            planStatus: "active",
            razorpaySubId: subId,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
        })

        await prisma.billingEvent.create({
          data: {
            userId,
            type: eventType,
            razorpayEventId:
              (event.account_id as string) || `${subId}-activated`,
            plan,
            status: "success",
            rawPayload: rawBody,
          },
        })

        console.log(`User ${userId} activated ${plan} plan`)
        break
      }

      // ── Payment captured (recurring monthly payment) ─────────────────────
      case "subscription.charged":
      case "payment.captured": {
        const payment = (
          payload.payment as Record<string, unknown>
        )?.entity as Record<string, unknown>
        const subId = payment?.subscription_id as string | undefined
        const amount = payment?.amount as number | undefined

        if (!subId) break

        const user = await prisma.user.findFirst({
          where: { razorpaySubId: subId },
        })

        if (!user) {
          console.error(`payment.captured: no user found for sub ${subId}`)
          break
        }

        // Extend subscription period by 1 month
        const newPeriodEnd = new Date()
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)

        await prisma.user.update({
          where: { id: user.id },
          data: {
            planStatus: "active",
            currentPeriodEnd: newPeriodEnd,
            // Reset monthly run counter on successful renewal
            workflowRunsUsed: 0,
            workflowRunsReset: new Date(),
          },
        })

        await prisma.billingEvent.create({
          data: {
            userId: user.id,
            type: eventType,
            razorpayEventId: payment?.id as string,
            amount: amount ?? null,
            plan: user.plan,
            status: "success",
            rawPayload: rawBody,
          },
        })

        console.log(
          `User ${user.id} payment captured ₹${(amount ?? 0) / 100}`
        )
        break
      }

      // ── Payment failed ────────────────────────────────────────────────────
      case "payment.failed": {
        const payment = (
          payload.payment as Record<string, unknown>
        )?.entity as Record<string, unknown>
        const subId = payment?.subscription_id as string | undefined
        if (!subId) break

        const user = await prisma.user.findFirst({
          where: { razorpaySubId: subId },
        })
        if (!user) break

        await prisma.user.update({
          where: { id: user.id },
          data: { planStatus: "past_due" },
        })

        await prisma.billingEvent.create({
          data: {
            userId: user.id,
            type: eventType,
            razorpayEventId: payment?.id as string,
            plan: user.plan,
            status: "failed",
            rawPayload: rawBody,
          },
        })

        console.log(
          `User ${user.id} payment failed — status set to past_due`
        )
        break
      }

      // ── Subscription cancelled ────────────────────────────────────────────
      case "subscription.cancelled": {
        const sub = (
          payload.subscription as Record<string, unknown>
        )?.entity as Record<string, unknown>
        const subId = sub?.id as string
        const notes = sub?.notes as Record<string, string> | undefined
        let userId = notes?.userId

        if (!userId) {
          const user = await prisma.user.findFirst({
            where: { razorpaySubId: subId },
          })
          if (!user) break
          userId = user.id
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: "FREE",
            planStatus: "cancelled",
            razorpaySubId: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          },
        })

        await prisma.billingEvent.create({
          data: {
            userId,
            type: eventType,
            razorpayEventId: subId,
            status: "success",
            rawPayload: rawBody,
          },
        })

        console.log(
          `Subscription ${subId} cancelled — user downgraded to FREE`
        )
        break
      }

      // ── Subscription paused ───────────────────────────────────────────────
      case "subscription.paused": {
        const sub = (
          payload.subscription as Record<string, unknown>
        )?.entity as Record<string, unknown>
        const subId = sub?.id as string
        const user = await prisma.user.findFirst({
          where: { razorpaySubId: subId },
        })
        if (!user) break

        await prisma.user.update({
          where: { id: user.id },
          data: { planStatus: "paused" },
        })
        break
      }

      // ── Subscription resumed ──────────────────────────────────────────────
      case "subscription.resumed": {
        const sub = (
          payload.subscription as Record<string, unknown>
        )?.entity as Record<string, unknown>
        const subId = sub?.id as string
        const user = await prisma.user.findFirst({
          where: { razorpaySubId: subId },
        })
        if (!user) break

        await prisma.user.update({
          where: { id: user.id },
          data: { planStatus: "active" },
        })
        break
      }

      default:
        console.log(`Unhandled billing webhook event: ${eventType}`)
    }
  } catch (error) {
    console.error(`Error handling billing webhook ${eventType}:`, error)
    // Return 200 so Razorpay doesn't retry — log the error for investigation
  }

  // Always return 200 to Razorpay — never 4xx/5xx (causes retries)
  return NextResponse.json({ received: true })
}
