"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import Link from "next/link"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("No verification token found. Check your email for the correct link.")
      return
    }

    // Call the verify API
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus("success")
          setMessage("Email verified! Redirecting to login...")
          setTimeout(() => router.push("/login?verified=true"), 2000)
        } else if (data.error === "TOKEN_EXPIRED") {
          setStatus("expired")
          setMessage("This verification link has expired. Request a new one below.")
        } else {
          setStatus("error")
          setMessage(data.error || "Verification failed. The link may be invalid.")
        }
      })
      .catch(() => {
        setStatus("error")
        setMessage("Network error. Please try again.")
      })
  }, [token, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 text-center flex flex-col items-center">
        {status === "loading" && (
          <>
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full
                            animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground">Verifying your email...</h2>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center
                            justify-center mx-auto mb-4 text-2xl text-green-500">✓</div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Email Verified!</h2>
            <p className="text-muted-foreground text-sm">{message}</p>
          </>
        )}
        {(status === "error" || status === "expired") && (
          <>
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center
                            justify-center mx-auto mb-4 text-2xl text-destructive">✕</div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {status === "expired" ? "Link Expired" : "Verification Failed"}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">{message}</p>
            <Link href="/resend-verification"
               className="inline-flex items-center justify-center rounded-md bg-primary
                          text-primary-foreground h-10 px-4 text-sm font-medium">
              Resend Verification Email
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  )
}
