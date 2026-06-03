"use client"

import { useTRPC } from "@/trpc/client"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { ZapIcon, SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PLAN_LIMITS } from "@/lib/plan-limits"

export const UsageBanner = () => {
  const trpc = useTRPC()
  const router = useRouter()
  const { data, isLoading } = useQuery(
    trpc.billing.getStatus.queryOptions()
  )

  if (isLoading || !data) return null

  const plan = (data.plan || "FREE") as keyof typeof PLAN_LIMITS
  const planInfo = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE

  // Paid user with unlimited runs — show small badge only
  if (plan !== "FREE" && data.planStatus === "active") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border-b border-orange-500/20">
        <SparklesIcon className="size-3.5 text-orange-500" />
        <span className="text-xs font-medium text-orange-500">
          {planInfo.name} Plan — {planInfo.runs.toLocaleString()} runs/month
        </span>
      </div>
    )
  }

  // Free user — show usage bar
  const used = data.quota.used
  const limit = data.quota.limit
  const percentUsed = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const isNearLimit = percentUsed >= 80
  const isAtLimit = percentUsed >= 100

  return (
    <div
      className={`px-4 py-2.5 border-b flex items-center gap-4 ${
        isAtLimit
          ? "bg-red-500/10 border-red-500/20"
          : isNearLimit
            ? "bg-amber-500/10 border-amber-500/20"
            : "bg-muted/40 border-border"
      }`}
    >
      {/* Left: icon + text */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <ZapIcon
          className={`size-3.5 shrink-0 ${
            isAtLimit
              ? "text-red-500"
              : isNearLimit
                ? "text-amber-500"
                : "text-muted-foreground"
          }`}
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {planInfo.name} Plan:
        </span>
        <span
          className={`text-xs font-semibold whitespace-nowrap ${
            isAtLimit
              ? "text-red-500"
              : isNearLimit
                ? "text-amber-500"
                : "text-foreground"
          }`}
        >
          {used.toLocaleString()} / {limit.toLocaleString()} runs
        </span>

        {/* Progress bar */}
        <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isAtLimit
                ? "bg-red-500"
                : isNearLimit
                  ? "bg-amber-500"
                  : "bg-orange-500"
            }`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      {/* Right: upgrade button */}
      <Button
        size="sm"
        variant="default"
        className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white shrink-0"
        onClick={() => router.push("/pricing")}
      >
        Upgrade Plan
      </Button>
    </div>
  )
}
