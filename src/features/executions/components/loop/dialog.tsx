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
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckIcon, Loader2Icon } from "lucide-react"

const COMMON_PATHS = [
  { label: "Google Sheets rows", path: "googleSheets.rows" },
  { label: "Google Drive files", path: "googleDrive.files" },
  { label: "Code output", path: "codeOutput" },
]

interface LoopDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { inputPath: string; itemVariable: string; maxIterations: number }) => void
  nodeId?: string
  workflowId?: string
}

export const LoopDialog = ({
  open,
  onOpenChange,
  onSubmit,
  nodeId,
  workflowId,
}: LoopDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [inputPath, setInputPath] = useState("googleSheets.rows")
  const [itemVariable, setItemVariable] = useState("item")
  const [maxIterations, setMaxIterations] = useState(100)
  const [saved, setSaved] = useState(false)

  const config = undefined as any;
const isLoading = false;

// Pre-fill from DB config when loaded
  useEffect(() => {
    if (config) {
      setInputPath(config.inputPath)
      setItemVariable(config.itemVariable)
      setMaxIterations(config.maxIterations)
    }
  }, [config])

  // Reset when dialog opens with no config
  useEffect(() => {
    if (open && !config) {
      setInputPath("googleSheets.rows")
      setItemVariable("item")
      setMaxIterations(100)
    }
  }, [open, config])

  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const handleSave = () => {
    onSubmit({ inputPath, itemVariable, maxIterations })

    if (workflowId && nodeId) {
      upsertMutation.mutate({
        workflowId,
        nodeId,
        inputPath,
        itemVariable,
        maxIterations,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Loop Over Items</DialogTitle>
          <DialogDescription>
            Iterate over an array and process each item
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Array Path */}
            <div className="space-y-2">
              <Label htmlFor="inputPath">Array Path</Label>
              <Input
                id="inputPath"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                placeholder="googleSheets.rows"
              />
              <p className="text-xs text-muted-foreground">
                Dot-notation path to the array in previous output
              </p>
            </div>

            {/* Common paths chips */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Common paths:
              </p>
              <div className="flex flex-wrap gap-2">
                {COMMON_PATHS.map((p) => (
                  <button
                    key={p.path}
                    type="button"
                    onClick={() => setInputPath(p.path)}
                    className="text-xs px-2 py-1 rounded border bg-muted hover:bg-muted/80"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Item Variable Name */}
            <div className="space-y-2">
              <Label htmlFor="itemVariable">Item Variable Name</Label>
              <Input
                id="itemVariable"
                value={itemVariable}
                onChange={(e) => setItemVariable(e.target.value)}
                placeholder="item"
              />
              <p className="text-xs text-muted-foreground">
                {"Access each item as {{item}} in downstream nodes"}
              </p>
            </div>

            {/* Max Iterations */}
            <div className="space-y-2">
              <Label htmlFor="maxIterations">Max Iterations</Label>
              <Input
                id="maxIterations"
                type="number"
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value))}
                min={1}
                max={10000}
              />
              <p className="text-xs text-muted-foreground">
                Safety limit — maximum items to process
              </p>
            </div>

            {/* Output Variables */}
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                ℹ️ How Loop works:
              </p>
              <p className="text-xs text-muted-foreground">
                For each item in the array, all connected downstream nodes
                are executed with that item as context.
              </p>
              <p className="text-xs text-muted-foreground italic">
                Example: 100 Sheets rows → Loop → Gmail = Gmail sends 100 emails, one per row.
              </p>
              <p className="text-xs font-medium text-muted-foreground mt-2">
                Variables per iteration:
              </p>
              <div className="text-xs text-muted-foreground font-mono space-y-0.5">
                <p>{`{{${itemVariable}}}`} — current array item</p>
                <p>{"{{itemIndex}}"} — current index (0-based)</p>
                <p>{"{{itemTotal}}"} — total iterations</p>
              </div>
              <p className="text-xs font-medium text-muted-foreground mt-2">
                After all iterations:
              </p>
              <div className="text-xs text-muted-foreground font-mono space-y-0.5">
                <p>{"{{loop.count}}"} — items processed</p>
                <p>{"{{loop.successCount}}"} — successful iterations</p>
                <p>{"{{loop.errorCount}}"} — failed iterations</p>
                <p>{"{{loop.errors}}"} — array of {"{{index, error}}"} for failures</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={upsertMutation.isPending || !inputPath.trim()}
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
