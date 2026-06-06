"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react"
import { ConditionsBuilder, createDefaultConfig } from "@/features/triggers/components/if-else/conditions-builder"

interface SwitchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeId: string
  workflowId: string
}

interface SwitchCase {
  id: string
  name: string
  conditionsJson: string
}

function createEmptyCase(index: number): SwitchCase {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `case_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: `Case ${index + 1}`,
    conditionsJson: JSON.stringify(createDefaultConfig()),
  }
}

export function SwitchDialog({ open, onOpenChange, nodeId, workflowId }: SwitchDialogProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [cases, setCases] = useState<SwitchCase[]>([createEmptyCase(0)])
  const [variableName, setVariableName] = useState("switch")
  const [saved, setSaved] = useState(false)
  const [activeCaseIndex, setActiveCaseIndex] = useState(0)

  const config = undefined as any;
  const isLoading = false;
  const isFetching = false;

  useEffect(() => {
    if (config) {
      setVariableName((config as any).variableName || "switch")
      try {
        const parsed = JSON.parse((config as any).casesJson || "[]") as SwitchCase[]
        if (parsed.length > 0) {
          setCases(parsed)
        }
      } catch {
        // keep defaults
      }
    }
  }, [config])

  // Reset to defaults when dialog opens for a node with no saved config
  useEffect(() => {
    if (open && !isLoading && !isFetching && !config) {
      setCases([createEmptyCase(0)])
      setVariableName("switch")
      setActiveCaseIndex(0)
    }
  }, [open, isLoading, isFetching, config])

  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const handleSave = useCallback(() => {
    upsertMutation.mutate({
      workflowId,
      nodeId,
      variableName,
      casesJson: JSON.stringify(cases),
    })
  }, [workflowId, nodeId, variableName, cases, upsertMutation])

  // Case management
  const addCase = () => {
    setCases((prev) => [...prev, createEmptyCase(prev.length)])
  }

  const removeCase = (index: number) => {
    setCases((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (activeCaseIndex >= next.length) {
        setActiveCaseIndex(Math.max(0, next.length - 1))
      }
      return next
    })
  }

  const updateCaseName = (index: number, name: string) => {
    setCases((prev) => prev.map((c, i) => (i === index ? { ...c, name } : c)))
  }

  const updateCaseConditions = (index: number, conditionsJson: string) => {
    setCases((prev) =>
      prev.map((c, i) => (i === index ? { ...c, conditionsJson } : c))
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Switch Node</DialogTitle>
          <DialogDescription>
            Route execution to one of N branches based on conditions. First matching case wins. Unmatched items go to Fallback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Variable name */}
          <div className="space-y-1">
            <Label className="text-xs">Output Variable Name</Label>
            <Input
              value={variableName}
              onChange={(e) => setVariableName(e.target.value)}
              placeholder="switch"
              className="h-8 text-sm"
            />
          </div>

          {/* Case tabs */}
          <div className="space-y-2">
            <Label className="text-xs">Cases</Label>
            <div className="flex flex-wrap gap-1">
              {cases.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCaseIndex(i)}
                  className={`
                    px-3 py-1 text-xs rounded-md border transition-colors
                    ${activeCaseIndex === i
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted hover:bg-muted/80 border-border"
                    }
                  `}
                >
                  {c.name || `Case ${i + 1}`}
                </button>
              ))}
              <button
                className="px-3 py-1 text-xs rounded-md bg-muted/50 text-muted-foreground border border-dashed border-border cursor-default"
              >
                Fallback ↓
              </button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addCase}>
                <PlusIcon size={12} className="mr-1" />
                Add Case
              </Button>
            </div>
          </div>

          {/* Active case config */}
          {cases[activeCaseIndex] && (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Input
                  value={cases[activeCaseIndex].name}
                  onChange={(e) => updateCaseName(activeCaseIndex, e.target.value)}
                  placeholder={`Case ${activeCaseIndex + 1}`}
                  className="h-8 text-sm flex-1"
                />
                {cases.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive"
                    onClick={() => removeCase(activeCaseIndex)}
                  >
                    <Trash2Icon size={14} />
                  </Button>
                )}
              </div>

              {/* Shared ConditionsBuilder */}
              <ConditionsBuilder
                value={cases[activeCaseIndex].conditionsJson}
                onChange={(json) => updateCaseConditions(activeCaseIndex, json)}
              />
            </div>
          )}

          {/* Fallback info */}
          <div className="rounded-lg border border-dashed p-3 bg-muted/10">
            <p className="text-xs text-muted-foreground">
              <strong>Fallback:</strong> If no case matches, execution flows through the Fallback branch.
              No configuration needed.
            </p>
          </div>

          {/* Output variables */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
            <h4 className="text-xs font-medium">Output variables</h4>
            {["branch", "matchedCase", "matchedName", "totalCases"].map((field) => (
              <p key={field} className="text-[11px] font-mono text-muted-foreground">
                {`{{${variableName || "switch"}.${field}}}`}
              </p>
            ))}
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            className="w-full"
            disabled={upsertMutation.isPending}
          >
            {upsertMutation.isPending ? (
              <>
                <Loader2Icon size={14} className="mr-2 animate-spin" />
                Saving…
              </>
            ) : saved ? (
              <>
                <CheckIcon size={14} className="mr-2" />
                Saved
              </>
            ) : (
              "Save Switch Configuration"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
