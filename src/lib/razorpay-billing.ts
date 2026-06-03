import Razorpay from "razorpay"

// Re-export plan constants for backward compatibility
export { PLAN_LIMITS, RAZORPAY_PLAN_IDS, type PlanKey } from "./plan-limits"

let _razorpayInstance: Razorpay | null = null

/**
 * Lazily initialise the Razorpay SDK.
 * Throws only when actually called — not at module-load time — so pages
 * that never touch billing (or only import PLAN_LIMITS) work fine without keys.
 */
export function getRazorpay(): Razorpay {
  if (!_razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      throw new Error(
        "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set to use billing features"
      )
    }

    _razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })
  }
  return _razorpayInstance
}

/**
 * Backward-compatible export.
 * Any property access (e.g. razorpayBilling.customers.create) lazily
 * initialises the SDK, so the module can be imported safely.
 */
export const razorpayBilling = new Proxy({} as Razorpay, {
  get(_target, prop, receiver) {
    const instance = getRazorpay()
    const value = Reflect.get(instance, prop, receiver)
    return typeof value === "function" ? value.bind(instance) : value
  },
})
