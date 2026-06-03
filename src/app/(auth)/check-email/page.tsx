"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { MailCheck } from "lucide-react"

function CheckEmailContent() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    setEmail(sessionStorage.getItem("pendingEmail"))
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-border text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
            <MailCheck className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            Check your inbox
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            We sent a verification link to<br/>
            <span className="font-semibold text-foreground">{email || "your email address"}</span>
          </p>
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">
              Didn't receive it? Check your spam folder or{" "}
              <Link href="/resend-verification" className="font-medium text-primary hover:text-primary/80">
                request a new link
              </Link>.
            </p>
          </div>
          <div className="mt-8">
            <Link href="/login" className="text-sm font-medium text-foreground underline hover:text-muted-foreground">
              Return to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailContent />
    </Suspense>
  )
}
