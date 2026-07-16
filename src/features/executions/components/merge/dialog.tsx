"use client"

import { useEffect, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckIcon, Loader2Icon } from "lucide-react"

interface MergeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: MergeConfig) => void
  nodeId?: string
  workflowId?: string
}

export interface MergeConfig {
  inputCount: number
  mergeMode: "position" | "combine" | "crossJoin" | "keyMatch" | "keyDiff"
  matchKey1: string
  matchKey2: string
  positionFill: "shortest" | "longest"
  branchKey1: string
  branchKey2: string
  branchKeys: string
  waitForAll: boolean
  variableName: string
}

const DEFAULT_CONFIG: MergeConfig = {
  inputCount: 2,
  mergeMode: "combine",
  matchKey1: "",
  matchKey2: "",
  positionFill: "shortest",
  branchKey1: "",
  branchKey2: "",
  branchKeys: "",
  waitForAll: true,
  variableName: "merge",
}

const MERGE_MODES = [
  {
    value: "combine",
    label: "Combine",
    description: "Merge all branch data into one object",
  },
  {
    value: "position",
    label: "Merge by Position",
    description: "Zip arrays by index position",
  },
  {
    value: "crossJoin",
    label: "Cross Join",
    description: "Cartesian product of all items",
  },
  {
    value: "keyMatch",
    label: "Keep Key Matches",
    description: "Inner join — only items matching by key",
  },
  {
    value: "keyDiff",
    label: "Keep Non-Matches",
    description: "Items in branch 1 NOT in branch 2",
  },
]

export const MergeDialog = ({
  open,
  onOpenChange,
  onSubmit,
  nodeId,
  workflowId,
}: MergeDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [config, setConfig] = useState<MergeConfig>(DEFAULT_CONFIG)
  const [saved, setSaved] = useState(false)

  const dbConfig = undefined as any;
const isLoading = false;

useEffect(() => {
    if (dbConfig) {
      setConfig({
        inputCount: dbConfig.inputCount,
        mergeMode: dbConfig.mergeMode as MergeConfig["mergeMode"],
        matchKey1: dbConfig.matchKey1,
        matchKey2: dbConfig.matchKey2,
        positionFill: dbConfig.positionFill as MergeConfig["positionFill"],
        branchKey1: dbConfig.branchKey1 ?? "",
        branchKey2: dbConfig.branchKey2 ?? "",
        branchKeys: dbConfig.branchKeys ?? "",
        waitForAll: dbConfig.waitForAll,
        variableName: dbConfig.variableName,
      })
    }
  }, [dbConfig])

  useEffect(() => {
    if (open && !dbConfig) {
      setConfig(DEFAULT_CONFIG)
    }
  }, [open, dbConfig])

  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const handleSave = () => {
    onSubmit(config)

    if (workflowId && nodeId) {
      upsertMutation.mutate({
        workflowId,
        nodeId,
        ...config,
      })
    }
  }

  const showKeyFields =
    config.mergeMode === "keyMatch" || config.mergeMode === "keyDiff"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge</DialogTitle>
          <DialogDescription>
            Combine data from multiple branches using different strategies.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Merge Mode */}
            <div className="space-y-2">
              <Label>Merge Mode</Label>
              <Select
                value={config.mergeMode}
                onValueChange={(v) =>
                  setConfig((c) => ({
                    ...c,
                    mergeMode: v as MergeConfig["mergeMode"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MERGE_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                {MERGE_MODES.find((m) => m.value === config.mergeMode)
                  ?.description}
              </p>
            </div>

            {/* Input Count */}
            <div className="space-y-2">
              <Label>Number of Input Branches</Label>
              <Input
                type="number"
                min={2}
                max={10}
                value={config.inputCount}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    inputCount: Math.max(2, Math.min(10, parseInt(e.target.value) || 2)),
                  }))
                }
              />
              <p className="text-[10px] text-muted-foreground">
                How many incoming branches to merge (2–10)
              </p>
            </div>

            {/* Position Fill Mode */}
            {config.mergeMode === "position" && (
              <div className="space-y-2">
                <Label>Position Fill</Label>
                <Select
                  value={config.positionFill}
                  onValueChange={(v) =>
                    setConfig((c) => ({
                      ...c,
                      positionFill: v as MergeConfig["positionFill"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shortest">
                      Zip to shortest
                    </SelectItem>
                    <SelectItem value="longest">
                      Pad shorter with null
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Key Match / Key Diff fields */}
            {showKeyFields && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Match Key (Branch 1)</Label>
                  <Input
                    placeholder="e.g. orderId or user.email"
                    className="font-mono text-sm"
                    value={config.matchKey1}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, matchKey1: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Match Key (Branch 2)</Label>
                  <Input
                    placeholder="e.g. orderId or email"
                    className="font-mono text-sm"
                    value={config.matchKey2}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, matchKey2: e.target.value }))
                    }
                  />
                </div>
                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {config.mergeMode === "keyMatch"
                      ? "Only items where both branches share the same key value will be kept."
                      : "Items from Branch 1 that have NO matching key in Branch 2 will be kept."}
                    {" "}Supports dot notation and {"{{variables}}"}.
                  </p>
                </div>
              </div>
            )}

            {/* Branch Variable Names */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Branch 1 Variable Name</Label>
                <Input
                  placeholder="e.g. gmail"
                  className="font-mono text-sm"
                  value={config.branchKey1}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, branchKey1: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Branch 2 Variable Name</Label>
                <Input
                  placeholder="e.g. slack"
                  className="font-mono text-sm"
                  value={config.branchKey2}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, branchKey2: e.target.value }))
                  }
                />
              </div>
              {config.inputCount > 2 && (
                <div className="space-y-2">
                  <Label>All Branch Keys (comma-separated)</Label>
                  <Input
                    placeholder="e.g. gmail,slack,notion"
                    className="font-mono text-sm"
                    value={config.branchKeys}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, branchKeys: e.target.value }))
                    }
                  />
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                Specify which upstream variable names to merge. Leave empty to
                auto-detect all branches.
              </p>
            </div>

            {/* Wait for All */}
            <div className="flex items-center gap-3">
              <Switch
                checked={config.waitForAll}
                onCheckedChange={(v) =>
                  setConfig((c) => ({ ...c, waitForAll: v }))
                }
              />
              <Label className="font-normal">
                Wait for all branches
              </Label>
            </div>

            {/* Variable Name */}
            <div className="space-y-2">
              <Label>Output Variable Name</Label>
              <Input
                placeholder="merge"
                className="font-mono text-sm"
                value={config.variableName}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, variableName: e.target.value }))
                }
              />
              <p className="text-[10px] text-muted-foreground">
                Access output as {"{{" + config.variableName + "}}"}
              </p>
            </div>

            {/* Save Button */}
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={upsertMutation.isPending}
            >
              {upsertMutation.isPending ? (
                <>
                  <Loader2Icon className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <CheckIcon className="size-4 mr-2" />
                  Saved ✓
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
