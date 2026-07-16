"use client"

import { memo, useMemo, useState } from "react"
import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import { GitFork } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { useTRPC } from "@/trpc/client"
import { SwitchDialog } from "./dialog"

interface SwitchCase {
  id: string
  name: string
  conditionsJson: string
}

const CASE_COLORS = [
  "emerald",
  "blue",
  "amber",
  "purple",
  "rose",
  "cyan",
  "orange",
  "pink",
]

const CASE_COLOR_CLASSES: Record<string, { text: string; dot: string; handle: string }> = {
  emerald: { text: "text-emerald-500", dot: "bg-emerald-500/30 border-emerald-500", handle: "!bg-emerald-500" },
  blue: { text: "text-blue-500", dot: "bg-blue-500/30 border-blue-500", handle: "!bg-blue-500" },
  amber: { text: "text-amber-500", dot: "bg-amber-500/30 border-amber-500", handle: "!bg-amber-500" },
  purple: { text: "text-purple-500", dot: "bg-purple-500/30 border-purple-500", handle: "!bg-purple-500" },
  rose: { text: "text-rose-500", dot: "bg-rose-500/30 border-rose-500", handle: "!bg-rose-500" },
  cyan: { text: "text-cyan-500", dot: "bg-cyan-500/30 border-cyan-500", handle: "!bg-cyan-500" },
  orange: { text: "text-orange-500", dot: "bg-orange-500/30 border-orange-500", handle: "!bg-orange-500" },
  pink: { text: "text-pink-500", dot: "bg-pink-500/30 border-pink-500", handle: "!bg-pink-500" },
}

export const SwitchNode = memo((props: NodeProps) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const params = useParams()
  const workflowId = params.workflowId as string
  const trpc = useTRPC()

  const config = props.data as any;

  const cases = useMemo(() => {
    try {
      const parsed = JSON.parse(config?.casesJson || "[]") as SwitchCase[]
      return parsed
    } catch {
      return []
    }
  }, [config?.casesJson])

  const isConfigured = cases.length > 0

  // Always add fallback as the last branch
  const allBranches = [
    ...cases.map((c, i) => ({
      id: c.id,
      name: c.name || `Case ${i + 1}`,
      color: CASE_COLORS[i % CASE_COLORS.length],
    })),
    {
      id: "fallback",
      name: "Fallback",
      color: "rose",
    },
  ]

  const totalBranches = allBranches.length

  return (
    <>
      <SwitchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nodeId={props.id}
        workflowId={workflowId}
      />

      {/* Input handle — left center */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />

      {/* Node body */}
      <div
        className={`
          w-[180px] rounded-xl border-2 bg-background shadow-md
          cursor-pointer select-none transition-all duration-150
          ${
            props.selected
              ? "border-primary shadow-lg"
              : isConfigured
                ? "border-border hover:border-primary/50"
                : "border-dashed border-muted-foreground/40 hover:border-primary/50"
          }
        `}
        onDoubleClick={() => setDialogOpen(true)}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-border">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-violet-500/10 border border-violet-500/20">
            <GitFork size={14} className="text-violet-500" />
          </div>
          <span className="text-xs font-semibold text-foreground">
            Switch
          </span>
        </div>

        {/* Branch labels */}
        <div className="flex flex-col px-3 py-2 gap-1">
          {allBranches.map((branch) => {
            const colors = CASE_COLOR_CLASSES[branch.color] || CASE_COLOR_CLASSES.emerald
            return (
              <div key={branch.id} className="flex items-center justify-between">
                <span className={`text-[10px] font-medium truncate max-w-[120px] ${colors.text}`}>
                  {branch.name}
                </span>
                <div className={`w-2 h-2 rounded-full border ${colors.dot}`} />
              </div>
            )
          })}
          {!isConfigured && (
            <p className="text-[11px] text-muted-foreground/50 italic">
              Not configured
            </p>
          )}
        </div>
      </div>

      {/* Output handles — one per branch */}
      {allBranches.map((branch, i) => {
        const colors = CASE_COLOR_CLASSES[branch.color] || CASE_COLOR_CLASSES.emerald
        // Distribute handles evenly along the right side
        const topPercent = totalBranches === 1
          ? 50
          : 15 + (i / (totalBranches - 1)) * 70
        return (
          <Handle
            key={branch.id}
            type="source"
            position={Position.Right}
            id={`source-${branch.id}`}
            style={{ top: `${topPercent}%`, right: -6 }}
            className={`!w-3 !h-3 ${colors.handle} !border-2 !border-background`}
          />
        )
      })}
    </>
  )
})

SwitchNode.displayName = "SwitchNode"
