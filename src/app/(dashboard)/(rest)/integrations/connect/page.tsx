"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"

/**
 * Manual connect page: Corsair redirects here with ?state=
 * Resolves via server API (KEK never touches the browser), then redirects to provider OAuth.
 */
function ConnectInner() {
  const search = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const state = search.get("state")
    if (!state) {
      setError("Missing connect state")
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/integrations/connect/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state }),
        })
        const data = (await res.json()) as {
          oauthUrl?: string
          error?: string
        }
        if (!res.ok || !data.oauthUrl) {
          if (!cancelled) setError(data.error ?? "Failed to resolve connect link")
          return
        }
        window.location.href = data.oauthUrl
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Connect resolve failed")
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [search])

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8">
      <p className="text-sm text-muted-foreground">
        {error ? `Connect error: ${error}` : "Redirecting to provider…"}
      </p>
    </div>
  )
}

export default function IntegrationsConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ConnectInner />
    </Suspense>
  )
}
