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
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2Icon, PlusIcon, Trash2Icon, GripVertical, ArrowDownAZ, ArrowUpZA } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import type { SortNodeData, SortKey, SortOperation } from "./types"
import { DEFAULT_SORT_KEY } from "./types"

interface SortDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: SortNodeData) => void
  defaultValues?: Partial<SortNodeData>
  nodeId?: string
  workflowId?: string
}

export const SortDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
}: SortDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [operation, setOperation] = useState<SortOperation>(
    (defaultValues.operation as SortOperation) || "SORT_ARRAY"
  )
  const [inputPath, setInputPath] = useState(defaultValues.inputPath || "")
  const [variableName, setVariableName] = useState(defaultValues.variableName || "sort")
  const [sortKeys, setSortKeys] = useState<SortKey[]>(
    defaultValues.sortKeys?.length ? defaultValues.sortKeys : [{ ...DEFAULT_SORT_KEY }]
  )
  const [saved, setSaved] = useState(false)

  const config = undefined as any;
const isLoading = false;

useEffect(() => {
    if (config) {
      setOperation((config.operation as SortOperation) || "SORT_ARRAY")
      setInputPath(config.inputPath || "")
      setVariableName(config.variableName || "sort")
      setSortKeys(
        config.sortKeys?.length > 0
          ? config.sortKeys
          : [{ ...DEFAULT_SORT_KEY }]
      )
    }
  }, [config])

  useEffect(() => {
    if (open && !config) {
      setOperation((defaultValues.operation as SortOperation) || "SORT_ARRAY")
      setInputPath(defaultValues.inputPath || "")
      setVariableName(defaultValues.variableName || "sort")
      setSortKeys(
        defaultValues.sortKeys?.length
          ? defaultValues.sortKeys
          : [{ ...DEFAULT_SORT_KEY }]
      )
    }
  }, [open, defaultValues, config])

  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const handleSave = () => {
    const values: SortNodeData = {
      operation,
      inputPath,
      variableName,
      sortKeys: (operation === "SORT_ARRAY" || operation === "SORT_KEYS") ? sortKeys : [],
    }

    onSubmit(values)

    if (workflowId && nodeId) {
      upsertMutation.mutate({
        workflowId,
        nodeId,
        operation,
        inputPath,
        variableName,
        sortKeys: values.sortKeys,
      })
    }
  }

  const addSortKey = () => setSortKeys([...sortKeys, { ...DEFAULT_SORT_KEY }])
  const removeSortKey = (index: number) => {
    const newKeys = [...sortKeys]
    newKeys.splice(index, 1)
    if (newKeys.length === 0) newKeys.push({ ...DEFAULT_SORT_KEY })
    setSortKeys(newKeys)
  }

  const updateSortKey = (index: number, updates: Partial<SortKey>) => {
    const newKeys = [...sortKeys]
    newKeys[index] = { ...newKeys[index], ...updates }
    setSortKeys(newKeys)
  }

  const moveKey = (index: number, dir: -1 | 1) => {
    if (index + dir < 0 || index + dir >= sortKeys.length) return
    const newKeys = [...sortKeys]
    const temp = newKeys[index]
    newKeys[index] = newKeys[index + dir]
    newKeys[index + dir] = temp
    setSortKeys(newKeys)
  }

  const v = variableName || "sort"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Sort Node</DialogTitle>
            <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "Saving..." : saved ? "Saved!" : "Save"}
            </Button>
          </div>
          <DialogDescription>
            Sort, reverse, or shuffle arrays and objects.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Operation Selector */}
            <div className="space-y-2">
              <Label>Operation</Label>
              <Select value={operation} onValueChange={(v) => setOperation(v as SortOperation)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SORT_ARRAY">Sort Array</SelectItem>
                  <SelectItem value="SORT_KEYS">Sort Object Keys</SelectItem>
                  <SelectItem value="REVERSE">Reverse Array</SelectItem>
                  <SelectItem value="SHUFFLE">Shuffle Array</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* 2. Input Path */}
            <div className="space-y-2">
              <Label>Input Path</Label>
              <Input
                placeholder="googleSheets.rows"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Dot-notation path to array. Leave blank to auto-detect array from previous node.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Variable Name</Label>
              <Input
                placeholder="sort"
                value={variableName}
                onChange={(e) => setVariableName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {`Reference as {{${v}.items}} or {{${v}.count}}`}
              </p>
            </div>

            {/* 3. Sort Keys */}
            {(operation === "SORT_ARRAY" || operation === "SORT_KEYS") && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      {operation === "SORT_KEYS" ? "Key Sort Rules" : "Sort Keys"}
                    </Label>
                    <Button variant="outline" size="sm" onClick={addSortKey} className="h-7 text-xs">
                      <PlusIcon className="size-3 mr-1" /> Add Key
                    </Button>
                  </div>

                  {sortKeys.map((key, i) => (
                    <div key={i} className="rounded-md border p-3 space-y-3 bg-card relative">
                      {/* Drag Handles / Order (Simulated for simplicity without dnd-kit dependency) */}
                      <div className="absolute left-2 top-3 bottom-0 flex flex-col gap-1 items-center w-6">
                        <button disabled={i === 0} onClick={() => moveKey(i, -1)} className="text-muted-foreground hover:text-primary disabled:opacity-30">
                          ▲
                        </button>
                        <GripVertical className="size-4 text-muted-foreground/30" />
                        <button disabled={i === sortKeys.length - 1} onClick={() => moveKey(i, 1)} className="text-muted-foreground hover:text-primary disabled:opacity-30">
                          ▼
                        </button>
                      </div>

                      <div className="pl-6 flex gap-2 items-start">
                        {operation === "SORT_ARRAY" && (
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Field Path</Label>
                            <Input
                              placeholder="e.g. user.profile.age"
                              value={key.field}
                              onChange={(e) => updateSortKey(i, { field: e.target.value })}
                              className="h-8"
                            />
                          </div>
                        )}

                        <div className="w-[120px] space-y-1">
                          <Label className="text-xs">Direction</Label>
                          <Select value={key.direction} onValueChange={(val: "asc" | "desc") => updateSortKey(i, { direction: val })}>
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="asc">
                                <span className="flex items-center gap-1"><ArrowDownAZ className="size-3" /> Asc</span>
                              </SelectItem>
                              <SelectItem value="desc">
                                <span className="flex items-center gap-1"><ArrowUpZA className="size-3" /> Desc</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="pt-5">
                          <Button variant="ghost" size="icon" onClick={() => removeSortKey(i)} className="h-8 w-8 text-destructive p-0">
                            <Trash2Icon className="size-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="pl-6">
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value={`adv-${i}`} className="border-b-0">
                            <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:text-primary">
                              Advanced Settings
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2">
                              <div className="flex gap-4">
                                <div className="space-y-1.5 flex-1">
                                  <Label className="text-xs">Type Hint</Label>
                                  <Select value={key.type} onValueChange={(val: any) => updateSortKey(i, { type: val })}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="auto">Auto-detect</SelectItem>
                                      <SelectItem value="string">String</SelectItem>
                                      <SelectItem value="number">Number</SelectItem>
                                      <SelectItem value="date">Date</SelectItem>
                                      <SelectItem value="boolean">Boolean</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5 flex-1">
                                  <Label className="text-xs">Nulls</Label>
                                  <Select value={key.nulls} onValueChange={(val: any) => updateSortKey(i, { nulls: val })}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="last">Nulls Last</SelectItem>
                                      <SelectItem value="first">Nulls First</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <Label className="text-xs">Case Sensitive</Label>
                                  <p className="text-[10px] text-muted-foreground">Apple vs apple</p>
                                </div>
                                <Switch checked={key.caseSensitive} onCheckedChange={(v) => updateSortKey(i, { caseSensitive: v })} />
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <Label className="text-xs">Natural Sort</Label>
                                  <p className="text-[10px] text-muted-foreground">item2 before item10</p>
                                </div>
                                <Switch checked={key.natural} onCheckedChange={(v) => updateSortKey(i, { natural: v })} />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs">String Locale</Label>
                                <Input placeholder="en, hi, ta, te, bn" value={key.locale} onChange={(e) => updateSortKey(i, { locale: e.target.value })} className="h-8" />
                                <p className="text-[10px] text-muted-foreground">Leave empty for standard JS sort. Use 'hi' for Hindi collation.</p>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 4. Live Preview */}
            <Separator />
            <div className="space-y-2">
              <Label>Sample Output Preview (Static Example)</Label>
              <div className="rounded-md bg-muted p-3">
                <pre className="text-xs text-muted-foreground overflow-x-auto">
                  {operation === "REVERSE" ? `[ { "id": 3 }, { "id": 2 }, { "id": 1 } ]` :
                    operation === "SHUFFLE" ? `[ { "id": 2 }, { "id": 3 }, { "id": 1 } ]` : 
                    `[ { "${sortKeys[0]?.field || "field"}": "A" }, { "${sortKeys[0]?.field || "field"}": "B" } ]`}
                </pre>
              </div>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
