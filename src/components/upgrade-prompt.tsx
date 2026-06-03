"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ZapIcon } from "lucide-react"

interface UpgradePromptProps {
  message?: string
}

export const UpgradePrompt = ({
  message = "You've reached your workflow run limit for this month.",
}: UpgradePromptProps) => {
  const router = useRouter()

  return (
    <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ZapIcon className="size-4 text-orange-500" />
        <p className="text-sm font-medium text-orange-500">Upgrade Your Plan</p>
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button
        size="sm"
        className="bg-orange-500 hover:bg-orange-600 text-white"
        onClick={() => router.push("/pricing")}
      >
        View Plans
      </Button>
    </div>
  )
}
