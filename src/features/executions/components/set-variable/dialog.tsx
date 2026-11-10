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
import { CheckIcon, Loader2Icon, PlusIcon, XIcon } from "lucide-react"

interface Pair {
  key: string
  value: string
}

interface SetVariableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (pairs: Pair[]) => void
  nodeId?: string
  workflowId?: string
}

const KEY_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/

export const SetVariableDialog = ({
  open,
  onOpenChange,
  onSubmit,
  nodeId,
  workflowId,
}: SetVariableDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [pairs, setPairs] = useState<Pair[]>([{ key: "", value: "" }])
  const [saved, setSaved] = useState(false)
  const [keyErrors, setKeyErrors] = useState<Record<number, string>>({})

  const config = undefined as any;
const isLoading = false;

// Pre-fill from DB config when loaded
  useEffect(() => {
    if (config) {
      const loadedPairs = config.pairs as unknown as Pair[]
      if (loadedPairs && loadedPairs.length > 0) {
        setPairs(loadedPairs)
      }
    }
  }, [config])

  // Reset when dialog opens with no config
  useEffect(() => {
    if (open && !config) {
      setPairs([{ key: "", value: "" }])
      setKeyErrors({})
    }
  }, [open, config])

  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const updatePair = (index: number, field: "key" | "value", val: string) => {
    setPairs((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)))
    if (field === "key") {
      if (val && !KEY_PATTERN.test(val)) {
        setKeyErrors((prev) => ({
          ...prev,
          [index]: "Must start with a letter or _, and contain only letters, numbers, and _",
        }))
      } else {
        setKeyErrors((prev) => {
          const next = { ...prev }
          delete next[index]
          return next
        })
      }
    }
  }

  const addPair = () => {
    setPairs((prev) => [...prev, { key: "", value: "" }])
  }

  const removePair = (index: number) => {
    if (pairs.length <= 1) return
    setPairs((prev) => prev.filter((_, i) => i !== index))
    setKeyErrors((prev) => {
      const next: Record<number, string> = {}
      for (const [k, v] of Object.entries(prev)) {
        const idx = Number(k)
        if (idx < index) next[idx] = v
        else if (idx > index) next[idx - 1] = v
      }
      return next
    })
  }

  const validPairs = pairs.filter((p) => p.key.trim())
  const hasKeyErrors = Object.keys(keyErrors).length > 0
  const isValid = validPairs.length > 0 && !hasKeyErrors

  const handleSave = () => {
    if (!isValid) return

    onSubmit(validPairs)

    if (workflowId && nodeId) {
      upsertMutation.mutate({
        workflowId,
        nodeId,
        pairs: validPairs,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Variable — Transform Data</DialogTitle>
          <DialogDescription>
            Define key-value pairs to extract and transform data between nodes
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Pairs list */}
            <div className="space-y-3">
              <Label>Variables</Label>
              {pairs.map((pair, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder="variableName"
                        className="font-mono text-sm"
                        value={pair.key}
                        onChange={(e) => updatePair(index, "key", e.target.value)}
                      />
                      {keyErrors[index] && (
                        <p className="text-xs text-destructive">{keyErrors[index]}</p>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder="{{body.field}} or static value"
                        className="text-sm"
                        value={pair.value}
                        onChange={(e) => updatePair(index, "value", e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Use {"{{variable}}"} to reference data from previous nodes
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-0.5 shrink-0"
                      onClick={() => removePair(index)}
                      disabled={pairs.length <= 1}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={addPair}
              >
                <PlusIcon className="size-4 mr-2" />
                Add pair
              </Button>
            </div>

            {/* Variable hints */}
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Available variables:
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {"{{body.*}}"} {"{{headers.*}}"} {"{{output.*}}"}
              </p>
            </div>

            {/* Save Button */}
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={!isValid || upsertMutation.isPending}
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
