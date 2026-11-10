"use client"

import { useState, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { createId } from "@paralleldrive/cuid2"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
import { Separator } from "@/components/ui/separator"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  OPERATION_LABELS,
  NO_FIELD_OPERATIONS,
  type AggregateNodeData,
  type AggregateOp,
  type AggregateOperation,
} from "./types"

interface AggregateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: AggregateNodeData) => void
  defaultValues?: AggregateNodeData
  nodeId: string
  workflowId: string
}

const ALL_OPERATIONS = Object.keys(OPERATION_LABELS) as AggregateOperation[]

const QUICK_PERCENTILES = [25, 50, 75, 90, 95, 99]

function MultiOpBuilder({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [ops, setOps] = useState<AggregateOp[]>(() => {
    try {
      return JSON.parse(value) as AggregateOp[]
    } catch {
      return []
    }
  })

  const update = useCallback(
    (newOps: AggregateOp[]) => {
      setOps(newOps)
      onChange(JSON.stringify(newOps))
    },
    [onChange]
  )

  useEffect(() => {
    try {
      const parsed = JSON.parse(value) as AggregateOp[]
      // Only update if stringified value changed to prevent unnecessary re-renders
      if (JSON.stringify(parsed) !== JSON.stringify(ops)) {
        setOps(parsed)
      }
    } catch {
      // ignore
    }
  }, [value])

  const addOp = () => {
    update([
      ...ops,
      {
        id: createId(),
        operation: "SUM",
        field: "",
        label: `result${ops.length + 1}`,
      },
    ])
  }

  const removeOp = (id: string) => update(ops.filter((o) => o.id !== id))

  const updateOp = (id: string, patch: Partial<AggregateOp>) => {
    update(ops.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }

  const NESTED_OPS = ALL_OPERATIONS.filter(
    (op) => op !== "MULTI" && op !== "GROUP_BY" && op !== "PIVOT"
  ) as Exclude<AggregateOperation, "MULTI" | "GROUP_BY" | "PIVOT">[]

  return (
    <div className="space-y-3">
      {ops.map((op) => (
        <div key={op.id} className="border rounded p-3 space-y-2 bg-muted/30">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Operation</Label>
              <Select
                value={op.operation}
                onValueChange={(v) =>
                  updateOp(op.id, {
                    operation: v as typeof NESTED_OPS[number],
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NESTED_OPS.map((o) => (
                    <SelectItem key={o} value={o} className="text-xs">
                      {OPERATION_LABELS[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Field</Label>
              <Input
                value={op.field}
                onChange={(e) => updateOp(op.id, { field: e.target.value })}
                placeholder="amount"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Label (output key)</Label>
              <Input
                value={op.label}
                onChange={(e) => updateOp(op.id, { label: e.target.value })}
                placeholder="totalRevenue"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeOp(op.id)}
            className="text-destructive hover:text-destructive h-6 text-xs"
          >
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addOp} className="w-full">
        + Add Operation
      </Button>
    </div>
  )
}

function OutputPreview({ operation, variableName }: { operation: string; variableName: string }) {
  const v = variableName || "aggregate"
  const previews: Record<string, string[]> = {
    COUNT: [`{{${v}.value}}`, `{{${v}.totalInput}}`],
    SUM: [`{{${v}.value}}`, `{{${v}.count}}`, `{{${v}.field}}`],
    AVERAGE: [`{{${v}.value}}`, `{{${v}.count}}`],
    MIN: [`{{${v}.value}}`, `{{${v}.count}}`],
    MAX: [`{{${v}.value}}`, `{{${v}.count}}`],
    MEDIAN: [`{{${v}.value}}`, `{{${v}.count}}`],
    MODE: [`{{${v}.value}}`, `{{${v}.occurrences}}`, `{{${v}.allModes}}`],
    STANDARD_DEVIATION: [`{{${v}.value}}`, `{{${v}.sampleStdDev}}`, `{{${v}.populationStdDev}}`],
    PERCENTILE: [`{{${v}.value}}`, `{{${v}.label}}`, `{{${v}.percentile}}`],
    CONCATENATE: [`{{${v}.value}}`, `{{${v}.count}}`],
    FIRST: [`{{${v}.value}}`, `{{${v}.isEmpty}}`],
    LAST: [`{{${v}.value}}`, `{{${v}.isEmpty}}`],
    DISTINCT: [`{{${v}.values}}`, `{{${v}.count}}`, `{{${v}.totalDistinct}}`],
    GROUP_BY: [
      `{{${v}.groups}}`,
      `{{${v}.groups[0].group}}`,
      `{{${v}.groups[0].count}}`,
      `{{${v}.groupCount}}`,
    ],
    PIVOT: [`{{${v}.data}}`, `{{${v}.rows}}`, `{{${v}.columns}}`],
    FREQUENCY_DISTRIBUTION: [
      `{{${v}.distribution}}`,
      `{{${v}.distribution[0].value}}`,
      `{{${v}.distribution[0].count}}`,
      `{{${v}.distribution[0].percentage}}`,
    ],
    MULTI: [`{{${v}.results.myLabel}}`, `{{${v}.operationCount}}`],
  }

  const vars = previews[operation] ?? [`{{${v}.value}}`]

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Output Variables</Label>
      <div className="flex flex-wrap gap-1">
        {vars.map((v2) => (
          <Badge key={v2} variant="secondary" className="text-xs font-mono">
            {v2}
          </Badge>
        ))}
      </div>
    </div>
  )
}

export function AggregateDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  nodeId,
  workflowId,
}: AggregateDialogProps) {
  const trpc = useTRPC()

  const dbConfig = undefined as any;

const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const merged = { ...defaultValues, ...dbConfig }

  const form = useForm<AggregateNodeData>({
    defaultValues: {
      operation: merged.operation ?? "COUNT",
      inputPath: merged.inputPath ?? "",
      field: merged.field ?? "",
      groupByField: merged.groupByField ?? "",
      pivotRowField: merged.pivotRowField ?? "",
      pivotColField: merged.pivotColField ?? "",
      pivotValueField: merged.pivotValueField ?? "",
      pivotValueOp: merged.pivotValueOp ?? "SUM",
      separator: merged.separator ?? ", ",
      percentile: merged.percentile ?? 90,
      countFilter: merged.countFilter ?? "",
      multiOps: merged.multiOps ?? "[]",
      groupAggOps: merged.groupAggOps ?? "[]",
      variableName: merged.variableName ?? "aggregate",
      includeInput: merged.includeInput ?? false,
      sortOutput: merged.sortOutput ?? true,
      topN: merged.topN ?? 0,
      nullHandling: merged.nullHandling ?? "exclude",
      roundDecimals: merged.roundDecimals ?? 2,
      continueOnFail: merged.continueOnFail ?? false,
    },
  })

  useEffect(() => {
    if (dbConfig) {
      form.reset({
        ...defaultValues,
        ...dbConfig,
      })
    }
  }, [dbConfig, defaultValues, form])

  const { register, watch, setValue, handleSubmit, formState: { isSubmitting } } = form
  const operation = watch("operation") as AggregateOperation
  const variableName = watch("variableName") as string
  const percentile = watch("percentile") as number

  const needsField = !NO_FIELD_OPERATIONS.includes(operation) && operation !== "GROUP_BY" && operation !== "PIVOT"

  const onFormSubmit = async (values: AggregateNodeData) => {
    try {
      await upsertMutation.mutateAsync({
        nodeId,
        workflowId,
        operation: (values.operation as AggregateOperation) ?? "COUNT",
        inputPath: values.inputPath ?? "",
        field: values.field ?? "",
        groupByField: values.groupByField ?? "",
        pivotRowField: values.pivotRowField ?? "",
        pivotColField: values.pivotColField ?? "",
        pivotValueField: values.pivotValueField ?? "",
        pivotValueOp: (values.pivotValueOp as "SUM" | "COUNT" | "AVERAGE" | "MIN" | "MAX") ?? "SUM",
        separator: values.separator ?? ", ",
        percentile: Number(values.percentile ?? 90),
        countFilter: values.countFilter ?? "",
        multiOps: values.multiOps ?? "[]",
        groupAggOps: values.groupAggOps ?? "[]",
        variableName: values.variableName ?? "aggregate",
        includeInput: values.includeInput ?? false,
        sortOutput: values.sortOutput ?? true,
        topN: Number(values.topN ?? 0),
        nullHandling: (values.nullHandling as "exclude" | "include_as_zero" | "include_as_null") ?? "exclude",
        roundDecimals: Number(values.roundDecimals ?? 2),
        continueOnFail: values.continueOnFail ?? false,
      })
      onSubmit(values)
      toast.success("Aggregate node saved")
      onOpenChange(false)
    } catch {
      toast.error("Failed to save Aggregate node")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aggregate Node</DialogTitle>
          <DialogDescription>
            Summarize, group, and compute statistics on array data
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
          {/* ── TOP ROW ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Operation</Label>
              <Select
                value={operation}
                onValueChange={(v) => setValue("operation", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operation" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_OPERATIONS.map((op) => (
                    <SelectItem key={op} value={op}>
                      {OPERATION_LABELS[op]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Variable Name</Label>
              <Input
                {...register("variableName")}
                placeholder="aggregate"
              />
            </div>
          </div>

          {/* Null Handling for numeric operations */}
          {["SUM", "AVERAGE", "MIN", "MAX", "MEDIAN", "MODE", "STANDARD_DEVIATION", "PERCENTILE"].includes(operation) && (
            <div className="space-y-2">
              <Label>Null Handling</Label>
              <Select
                value={watch("nullHandling") as string}
                onValueChange={(v) => setValue("nullHandling", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclude">Exclude nulls (skip)</SelectItem>
                  <SelectItem value="include_as_zero">Treat nulls as 0</SelectItem>
                  <SelectItem value="include_as_null">Include as null</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {/* ── INPUT SECTION ────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>Input Path</Label>
            <Input
              {...register("inputPath")}
              placeholder="filter.items or googleSheets.rows"
            />
            <p className="text-xs text-muted-foreground">
              Dot-notation path to the array. Leave blank to auto-detect.
            </p>
          </div>

          {/* ── FIELD CONFIGURATION ──────────────────────────────── */}
          {needsField && (
            <div className="space-y-2">
              <Label>Field</Label>
              <Input
                {...register("field")}
                placeholder='amount, user.profile.age, [this] for primitives'
              />
              <p className="text-xs text-muted-foreground">
                Dot-notation field path within each item. Use [this] for primitive arrays.
              </p>
            </div>
          )}

          {/* COUNT: optional filter */}
          {operation === "COUNT" && (
            <div className="space-y-2">
              <Label>Count Filter (optional)</Label>
              <Textarea
                {...register("countFilter")}
                placeholder='JSON filter condition, e.g. [{"field":"status","operator":"equals","value":"captured"}]'
                className="font-mono text-xs h-16"
              />
              <p className="text-xs text-muted-foreground">
                Only count items matching this condition. Leave blank to count all.
              </p>
            </div>
          )}

          {/* CONCATENATE: separator */}
          {operation === "CONCATENATE" && (
            <div className="space-y-2">
              <Label>Separator</Label>
              <Input {...register("separator")} placeholder=", " />
            </div>
          )}

          {/* PERCENTILE: percentile number with quick-select */}
          {operation === "PERCENTILE" && (
            <div className="space-y-2">
              <Label>Percentile (0–100)</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  {...register("percentile", { valueAsNumber: true })}
                  className="w-24"
                />
                <div className="flex gap-1 flex-wrap">
                  {QUICK_PERCENTILES.map((p) => (
                    <Button
                      key={p}
                      type="button"
                      variant={percentile === p ? "default" : "outline"}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setValue("percentile", p)}
                    >
                      P{p}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* GROUP_BY: group field */}
          {operation === "GROUP_BY" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Group By Field</Label>
                <Input
                  {...register("groupByField")}
                  placeholder="city, status, category"
                />
              </div>
              <div className="space-y-2">
                <Label>Nested Operations (per group)</Label>
                <MultiOpBuilder
                  value={watch("groupAggOps") as string}
                  onChange={(v) => setValue("groupAggOps", v)}
                />
              </div>
            </div>
          )}

          {/* PIVOT: row, col, value fields */}
          {operation === "PIVOT" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Row Field</Label>
                  <Input {...register("pivotRowField")} placeholder="region" />
                </div>
                <div className="space-y-2">
                  <Label>Column Field</Label>
                  <Input {...register("pivotColField")} placeholder="category" />
                </div>
                <div className="space-y-2">
                  <Label>Value Field</Label>
                  <Input {...register("pivotValueField")} placeholder="revenue" />
                </div>
                <div className="space-y-2">
                  <Label>Value Operation</Label>
                  <Select
                    value={watch("pivotValueOp") as string}
                    onValueChange={(v) => setValue("pivotValueOp", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["SUM", "COUNT", "AVERAGE", "MIN", "MAX"] as const).map((op) => (
                        <SelectItem key={op} value={op}>{op}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* MULTI: operation builder */}
          {operation === "MULTI" && (
            <div className="space-y-2">
              <Label>Operations</Label>
              <MultiOpBuilder
                value={watch("multiOps") as string}
                onChange={(v) => setValue("multiOps", v)}
              />
            </div>
          )}

          {/* ── OUTPUT OPTIONS ─────────────────────────────────────── */}
          <Accordion type="single" collapsible>
            <AccordionItem value="output-options">
              <AccordionTrigger className="text-sm">Output Options</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Round Decimals</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      {...register("roundDecimals", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Top N Results (0 = all)</Label>
                    <Input
                      type="number"
                      min={0}
                      {...register("topN", { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sort Output Descending</Label>
                    <p className="text-xs text-muted-foreground">Sort GROUP_BY/FREQUENCY by count</p>
                  </div>
                  <Switch
                    checked={watch("sortOutput") as boolean}
                    onCheckedChange={(v) => setValue("sortOutput", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Continue on Fail</Label>
                    <p className="text-xs text-muted-foreground">Return null instead of failing workflow</p>
                  </div>
                  <Switch
                    checked={watch("continueOnFail") as boolean}
                    onCheckedChange={(v) => setValue("continueOnFail", v)}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Separator />

          {/* ── OUTPUT PREVIEW ─────────────────────────────────── */}
          <OutputPreview operation={operation} variableName={variableName} />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
