"use client"

import { memo, useState } from "react"
import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import { GitBranch } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { useTRPC } from "@/trpc/client"
import { IfElseDialog } from "./dialog"
import type { ConditionsConfig } from "./evaluate-conditions"

const MAX_PREVIEW_LENGTH = 32

export const IfElseNode = memo((props: NodeProps) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const params = useParams()
  const workflowId = params.workflowId as string
  const trpc = useTRPC()

  const config = props.data as any;

  let conditionPreview = "Not configured"
  let isConfigured = false

  if (config?.conditionsJson && config.conditionsJson.trim() !== "") {
    try {
      const parsed = JSON.parse(config.conditionsJson) as ConditionsConfig
      const totalConditions = parsed.groups.reduce(
        (sum, g) => sum + g.conditions.length,
        0
      )
      if (totalConditions > 0) {
        conditionPreview = `${totalConditions} condition${totalConditions > 1 ? "s" : ""} (${parsed.groups.length} group${parsed.groups.length > 1 ? "s" : ""})`
        isConfigured = true
      }
    } catch {
      // fallback to legacy
    }
  }

  if (!isConfigured && config?.field) {
    conditionPreview = `${config.field} ${config.operator.toLowerCase().replace(/_/g, " ")} ${config.value}`.slice(
      0,
      MAX_PREVIEW_LENGTH
    )
    isConfigured = true
  }

  return (
    <>
      <IfElseDialog
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
          w-[160px] rounded-xl border-2 bg-background shadow-md
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
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-amber-500/10 border border-amber-500/20">
            <GitBranch size={14} className="text-amber-500" />
          </div>
          <span className="text-xs font-semibold text-foreground">
            If / Else
          </span>
        </div>

        {/* Condition preview */}
        <div className="px-3 py-2">
          <p
            className={`text-[11px] font-mono leading-tight truncate ${
              isConfigured
                ? "text-muted-foreground"
                : "text-muted-foreground/50 italic"
            }`}
          >
            {conditionPreview}
          </p>
        </div>

        {/* Branch labels */}
        <div className="flex flex-col px-3 pb-3 gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-emerald-500">
              TRUE
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-500/30 border border-emerald-500" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-red-500">FALSE</span>
            <div className="w-2 h-2 rounded-full bg-red-500/30 border border-red-500" />
          </div>
        </div>
      </div>

      {/* TRUE output handle — right top */}
      <Handle
        type="source"
        position={Position.Right}
        id="source-true"
        style={{ top: "38%", right: -6 }}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-background"
      />

      {/* FALSE output handle — right bottom */}
      <Handle
        type="source"
        position={Position.Right}
        id="source-false"
        style={{ top: "68%", right: -6 }}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-background"
      />
    </>
  )
})

IfElseNode.displayName = "IfElseNode"
