"use client"

// Load Razorpay checkout.js script dynamically
export function useRazorpay() {
  const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as unknown as Record<string, unknown>).Razorpay) {
        resolve(true)
        return
      }
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.async = true
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const openSubscriptionCheckout = async ({
    subscriptionId,
    userEmail,
    userName,
    plan,
    onSuccess,
    onError,
    onDismiss,
  }: {
    subscriptionId: string
    userEmail: string
    userName: string
    plan: string
    onSuccess: (paymentId: string, subscriptionId: string) => void
    onError: (error: string) => void
    onDismiss: () => void
  }) => {
    const loaded = await loadRazorpay()
    if (!loaded) {
      onError(
        "Failed to load payment gateway. Check your internet connection."
      )
      return
    }

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      onError("Payment gateway configuration is missing (Razorpay Key).")
      return
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      subscription_id: subscriptionId,
      name: "Nodebase",
      description: `${plan} Plan — Monthly Subscription`,
      image: "https://nodebase.mayanksaraswal.in/logos/nodebase.png",

      // Pre-fill user details to speed up checkout
      prefill: {
        name: userName,
        email: userEmail,
      },

      // Theme matches Nodebase orange brand
      theme: {
        color: "#F97316",
      },

      handler: (response: {
        razorpay_payment_id: string
        razorpay_subscription_id: string
        razorpay_signature: string
      }) => {
        onSuccess(
          response.razorpay_payment_id,
          response.razorpay_subscription_id
        )
      },

      modal: {
        ondismiss: onDismiss,
        escape: true,
        animation: true,
      },
    }

    const RazorpayCheckout = (
      window as unknown as Record<string, unknown>
    ).Razorpay as new (opts: typeof options) => {
      on: (event: string, handler: (resp: { error: { description: string } }) => void) => void
      open: () => void
    }
    const rzp = new RazorpayCheckout(options)
    rzp.on(
      "payment.failed",
      (response: { error: { description: string } }) => {
        onError(
          response.error.description || "Payment failed. Please try again."
        )
      }
    )
    rzp.open()
  }

  return { openSubscriptionCheckout }
}
