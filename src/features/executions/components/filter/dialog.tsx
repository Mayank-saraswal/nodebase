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
import { Loader2Icon, PlusIcon, Trash2Icon, ChevronDownIcon } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { createId } from "@paralleldrive/cuid2"
import type {
  FilterNodeData,
  FilterCondition,
  ConditionGroup,
  FilterOperator,
  FilterOperation,
  OutputMode,
} from "./types"
import {
  OPERATOR_LABELS,
  NO_VALUE_OPERATORS,
  DUAL_VALUE_OPERATORS,
  ALL_OPERATORS,
  isConditionGroup,
} from "./types"

interface FilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: FilterNodeData) => void
  defaultValues?: Partial<FilterNodeData>
  nodeId?: string
  workflowId?: string
}

const DEFAULT_CONDITION = (): FilterCondition => ({
  id: createId(),
  field: "",
  operator: "equals",
  value: "",
  value2: "",
  caseSensitive: false,
  trimWhitespace: true,
  typeCoerce: true,
})

const DEFAULT_GROUP = (): ConditionGroup => ({
  id: createId(),
  logic: "AND",
  conditions: [DEFAULT_CONDITION()],
})

// Nesting border colors per level
const NEST_COLORS = [
  "border-l-indigo-400",
  "border-l-emerald-400",
  "border-l-amber-400",
]

// ─── ConditionRow ─────────────────────────────────────────────────────────────
function ConditionRow({
  condition,
  onChange,
  onRemove,
}: {
  condition: FilterCondition
  onChange: (c: FilterCondition) => void
  onRemove: () => void
}) {
  const noValue = NO_VALUE_OPERATORS.includes(condition.operator)
  const isDual = DUAL_VALUE_OPERATORS.includes(condition.operator)
  const isTypeOf = condition.operator === "typeof"
  const isInArray = condition.operator === "in_array" || condition.operator === "not_in_array"
  const isRegex = condition.operator === "regex_match"

  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-muted/20 p-3">
      <div className="flex items-start gap-2">
        {/* Field */}
        <div className="flex-1 min-w-0">
          <Input
            placeholder="field.path or [this]"
            value={condition.field}
            onChange={(e) => onChange({ ...condition, field: e.target.value })}
            className="h-8 text-xs font-mono"
          />
        </div>

        {/* Operator */}
        <div className="w-[180px] shrink-0">
          <Select
            value={condition.operator}
            onValueChange={(v) => onChange({ ...condition, operator: v as FilterOperator })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {ALL_OPERATORS.map((op) => (
                <SelectItem key={op} value={op} className="text-xs">
                  {OPERATOR_LABELS[op]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Value(s) */}
        {!noValue && (
          isTypeOf ? (
            <div className="w-[110px] shrink-0">
              <Select
                value={condition.value}
                onValueChange={(v) => onChange({ ...condition, value: v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="type" /></SelectTrigger>
                <SelectContent>
                  {["string", "number", "boolean", "array", "object", "null", "undefined"].map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : isDual ? (
            <>
              <div className="w-[90px] shrink-0">
                <Input
                  placeholder="Min"
                  value={condition.value}
                  onChange={(e) => onChange({ ...condition, value: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="w-[90px] shrink-0">
                <Input
                  placeholder="Max"
                  value={condition.value2}
                  onChange={(e) => onChange({ ...condition, value2: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 min-w-0">
              <Input
                placeholder={
                  isInArray ? "Val1,Val2 or [\"v1\",\"v2\"]" :
                  isRegex ? "^pattern (no /slashes/)" :
                  "value"
                }
                value={condition.value}
                onChange={(e) => onChange({ ...condition, value: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          )
        )}

        {/* Remove button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      </div>

      {/* Advanced settings collapsible */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="adv" className="border-b-0">
          <AccordionTrigger className="py-1 text-[10px] text-muted-foreground hover:text-primary h-auto">
            Advanced
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="flex items-center gap-6 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch
                  checked={condition.caseSensitive}
                  onCheckedChange={(v) => onChange({ ...condition, caseSensitive: v })}
                  className="scale-75"
                />
                Case sensitive
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch
                  checked={condition.trimWhitespace}
                  onCheckedChange={(v) => onChange({ ...condition, trimWhitespace: v })}
                  className="scale-75"
                />
                Trim spaces
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch
                  checked={condition.typeCoerce}
                  onCheckedChange={(v) => onChange({ ...condition, typeCoerce: v })}
                  className="scale-75"
                />
                Type coerce
              </label>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

// ─── ConditionGroupEditor ─────────────────────────────────────────────────────
function ConditionGroupEditor({
  group,
  onChange,
  onRemove,
  depth,
}: {
  group: ConditionGroup
  onChange: (g: ConditionGroup) => void
  onRemove?: () => void
  depth: number
}) {
  const colorClass = NEST_COLORS[Math.min(depth, NEST_COLORS.length - 1)]

  const updateCondition = (idx: number, updated: FilterCondition | ConditionGroup) => {
    const newConditions = [...group.conditions]
    newConditions[idx] = updated
    onChange({ ...group, conditions: newConditions })
  }

  const removeCondition = (idx: number) => {
    const newConditions = group.conditions.filter((_, i) => i !== idx)
    onChange({ ...group, conditions: newConditions })
  }

  const addCondition = () => {
    onChange({ ...group, conditions: [...group.conditions, DEFAULT_CONDITION()] })
  }

  const addSubGroup = () => {
    if (depth >= 2) return // max 3 levels (0, 1, 2)
    onChange({ ...group, conditions: [...group.conditions, DEFAULT_GROUP()] })
  }

  return (
    <div className={`border-l-2 ${colorClass} pl-3 space-y-2`}>
      {/* Group header */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground shrink-0">Match</span>
        <div className="flex rounded-md overflow-hidden border">
          {(["AND", "OR"] as const).map((logic) => (
            <button
              key={logic}
              onClick={() => onChange({ ...group, logic })}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                group.logic === logic
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {logic}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">of these conditions</span>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="ml-auto h-6 w-6 text-destructive hover:text-destructive"
          >
            <Trash2Icon className="size-3" />
          </Button>
        )}
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        {group.conditions.map((cond, idx) =>
          isConditionGroup(cond) ? (
            <ConditionGroupEditor
              key={cond.id}
              group={cond}
              depth={depth + 1}
              onChange={(updated) => updateCondition(idx, updated)}
              onRemove={() => removeCondition(idx)}
            />
          ) : (
            <ConditionRow
              key={cond.id}
              condition={cond as FilterCondition}
              onChange={(updated) => updateCondition(idx, updated)}
              onRemove={() => removeCondition(idx)}
            />
          )
        )}
      </div>

      {/* Add buttons */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={addCondition} className="h-7 text-xs gap-1">
          <PlusIcon className="size-3" /> Add condition
        </Button>
        {depth < 2 && (
          <Button variant="ghost" size="sm" onClick={addSubGroup} className="h-7 text-xs gap-1 text-muted-foreground">
            <PlusIcon className="size-3" /> Add sub-group
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── FilterDialog ─────────────────────────────────────────────────────────────
export const FilterDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
}: FilterDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [operation, setOperation] = useState<FilterOperation>(
    (defaultValues.operation as FilterOperation) || "FILTER_ARRAY"
  )
  const [inputArray, setInputArray] = useState(defaultValues.inputArray || "")
  const [inputObject, setInputObject] = useState(defaultValues.inputObject || "")
  const [variableName, setVariableName] = useState(defaultValues.variableName || "filter")
  const [outputMode, setOutputMode] = useState<OutputMode>(
    (defaultValues.outputMode as OutputMode) || "filtered"
  )
  const [rootLogic, setRootLogic] = useState<"AND" | "OR">(
    (defaultValues.rootLogic as "AND" | "OR") || "AND"
  )
  const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>([DEFAULT_GROUP()])
  const [stopOnEmpty, setStopOnEmpty] = useState(defaultValues.stopOnEmpty ?? false)
  const [includeMetadata, setIncludeMetadata] = useState(defaultValues.includeMetadata ?? false)
  const [continueOnFail, setContinueOnFail] = useState(defaultValues.continueOnFail ?? false)
  const [keyFilterMode, setKeyFilterMode] = useState<"key_name" | "key_value" | "both">(
    (defaultValues.keyFilterMode as "key_name" | "key_value" | "both") || "key_name"
  )
  const [keepMatching, setKeepMatching] = useState(defaultValues.keepMatching ?? true)
  const [saved, setSaved] = useState(false)

  const config = undefined as any;
const isLoading = false;

// Load from DB
  useEffect(() => {
    if (config) {
      setOperation((config.operation as FilterOperation) || "FILTER_ARRAY")
      setInputArray(config.inputArray || "")
      setInputObject(config.inputObject || "")
      setVariableName(config.variableName || "filter")
      setOutputMode((config.outputMode as OutputMode) || "filtered")
      setRootLogic((config.rootLogic as "AND" | "OR") || "AND")
      setStopOnEmpty(config.stopOnEmpty ?? false)
      setIncludeMetadata(config.includeMetadata ?? false)
      setContinueOnFail(config.continueOnFail ?? false)
      setKeyFilterMode((config.keyFilterMode as "key_name" | "key_value" | "both") || "key_name")
      setKeepMatching(config.keepMatching ?? true)
      try {
        const parsed = JSON.parse(config.conditionGroups) as ConditionGroup[]
        setConditionGroups(parsed.length > 0 ? parsed : [DEFAULT_GROUP()])
      } catch {
        setConditionGroups([DEFAULT_GROUP()])
      }
    }
  }, [config])

  // Load from defaultValues when no DB config
  useEffect(() => {
    if (open && !config) {
      setOperation((defaultValues.operation as FilterOperation) || "FILTER_ARRAY")
      setInputArray(defaultValues.inputArray || "")
      setInputObject(defaultValues.inputObject || "")
      setVariableName(defaultValues.variableName || "filter")
      setOutputMode((defaultValues.outputMode as OutputMode) || "filtered")
      setRootLogic((defaultValues.rootLogic as "AND" | "OR") || "AND")
      setStopOnEmpty(defaultValues.stopOnEmpty ?? false)
      setIncludeMetadata(defaultValues.includeMetadata ?? false)
      setContinueOnFail(defaultValues.continueOnFail ?? false)
      setKeyFilterMode((defaultValues.keyFilterMode as "key_name" | "key_value" | "both") || "key_name")
      setKeepMatching(defaultValues.keepMatching ?? true)
      try {
        const parsed = JSON.parse(defaultValues.conditionGroups || "[]") as ConditionGroup[]
        setConditionGroups(parsed.length > 0 ? parsed : [DEFAULT_GROUP()])
      } catch {
        setConditionGroups([DEFAULT_GROUP()])
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, config])

  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const handleSave = useCallback(() => {
    const values: FilterNodeData = {
      operation,
      inputArray,
      inputObject,
      variableName,
      outputMode,
      rootLogic,
      conditionGroups: JSON.stringify(conditionGroups),
      stopOnEmpty,
      includeMetadata,
      continueOnFail,
      keyFilterMode,
      keepMatching,
    }
    onSubmit(values)

    if (workflowId && nodeId) {
      upsertMutation.mutate({
        workflowId,
        nodeId,
        operation: operation as "FILTER_ARRAY" | "FILTER_OBJECT_KEYS",
        inputArray,
        inputObject,
        variableName,
        outputMode: outputMode as "filtered" | "rejected" | "both" | "stats_only",
        rootLogic: rootLogic as "AND" | "OR",
        conditionGroups: JSON.stringify(conditionGroups),
        stopOnEmpty,
        includeMetadata,
        continueOnFail,
        keyFilterMode: keyFilterMode as "key_name" | "key_value" | "both",
        keepMatching,
      })
    }
  }, [operation, inputArray, inputObject, variableName, outputMode, rootLogic, conditionGroups, stopOnEmpty, includeMetadata, continueOnFail, keyFilterMode, keepMatching, onSubmit, workflowId, nodeId, upsertMutation])

  const addGroup = () => setConditionGroups([...conditionGroups, DEFAULT_GROUP()])
  const removeGroup = (idx: number) => {
    const updated = conditionGroups.filter((_, i) => i !== idx)
    setConditionGroups(updated.length > 0 ? updated : [DEFAULT_GROUP()])
  }
  const updateGroup = (idx: number, updated: ConditionGroup) => {
    const newGroups = [...conditionGroups]
    newGroups[idx] = updated
    setConditionGroups(newGroups)
  }

  const v = variableName || "filter"
  const totalConditions = conditionGroups.reduce((total, g) => {
    const countInGroup = (grp: ConditionGroup): number =>
      grp.conditions.reduce((sum, c) => isConditionGroup(c) ? sum + countInGroup(c) : sum + 1, 0)
    return total + countInGroup(g)
  }, 0)

  // Output variable hints based on mode + operation
  const outputHints = operation === "FILTER_OBJECT_KEYS"
    ? [`{{${v}.result}}`, `{{${v}.removedKeys}}`, `{{${v}.keptCount}}`, `{{${v}.removedCount}}`]
    : outputMode === "rejected"
      ? [`{{${v}.items}} — rejected items`, `{{${v}.rejectedCount}}`, `{{${v}.totalInput}}`, `{{${v}.hasResults}}`]
      : outputMode === "both"
        ? [`{{${v}.items}} — passed`, `{{${v}.rejected}} — failed`, `{{${v}.count}}`, `{{${v}.rejectedCount}}`, `{{${v}.passRate}}`]
        : outputMode === "stats_only"
          ? [`{{${v}.count}}`, `{{${v}.rejectedCount}}`, `{{${v}.totalInput}}`, `{{${v}.passRate}}`, `{{${v}.hasResults}}`]
          : [`{{${v}.items}}`, `{{${v}.count}}`, `{{${v}.rejectedCount}}`, `{{${v}.totalInput}}`, `{{${v}.passRate}}`, `{{${v}.hasResults}}`]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Filter Node</DialogTitle>
            <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "Saving..." : saved ? "Saved!" : "Save"}
            </Button>
          </div>
          <DialogDescription>
            Filter arrays by compound conditions or filter object keys.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* ── Operation + Variable + Output Mode ── */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Operation</Label>
                <Select value={operation} onValueChange={(v) => setOperation(v as FilterOperation)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FILTER_ARRAY" className="text-xs">Filter Array</SelectItem>
                    <SelectItem value="FILTER_OBJECT_KEYS" className="text-xs">Filter Object Keys</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Variable Name</Label>
                <Input
                  value={variableName}
                  onChange={(e) => setVariableName(e.target.value)}
                  placeholder="filter"
                  className="h-8 text-xs"
                />
              </div>

              {operation === "FILTER_ARRAY" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Output Mode</Label>
                  <Select value={outputMode} onValueChange={(v) => setOutputMode(v as OutputMode)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="filtered" className="text-xs">Filtered items (default)</SelectItem>
                      <SelectItem value="rejected" className="text-xs">Rejected items</SelectItem>
                      <SelectItem value="both" className="text-xs">Both (pass + fail)</SelectItem>
                      <SelectItem value="stats_only" className="text-xs">Stats only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Separator />

            {/* ── Input ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Input
              </Label>
              {operation === "FILTER_ARRAY" ? (
                <div className="space-y-1">
                  <Label className="text-xs">Input Array</Label>
                  <Input
                    placeholder="{{previousNode.items}}"
                    value={inputArray}
                    onChange={(e) => setInputArray(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Template expression that resolves to an array
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Input Object</Label>
                    <Input
                      placeholder="{{previousNode.data}}"
                      value={inputObject}
                      onChange={(e) => setInputObject(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Key Filter Mode</Label>
                      <Select value={keyFilterMode} onValueChange={(v) => setKeyFilterMode(v as "key_name" | "key_value" | "both")}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="key_name" className="text-xs">By key name</SelectItem>
                          <SelectItem value="key_value" className="text-xs">By key value</SelectItem>
                          <SelectItem value="both" className="text-xs">By both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Action</Label>
                      <div className="flex rounded-md overflow-hidden border h-8">
                        {[
                          { val: true, label: "Keep matching" },
                          { val: false, label: "Remove matching" },
                        ].map(({ val, label }) => (
                          <button
                            key={String(val)}
                            onClick={() => setKeepMatching(val)}
                            className={`flex-1 text-xs transition-colors ${
                              keepMatching === val
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* ── Conditions ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Conditions
                  </Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {totalConditions} condition{totalConditions !== 1 ? "s" : ""} across{" "}
                    {conditionGroups.length} group{conditionGroups.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Root logic (only relevant if >1 group) */}
                {conditionGroups.length > 1 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Groups match</span>
                    <div className="flex rounded-md overflow-hidden border">
                      {(["AND", "OR"] as const).map((logic) => (
                        <button
                          key={logic}
                          onClick={() => setRootLogic(logic)}
                          className={`px-3 py-1 text-xs font-medium transition-colors ${
                            rootLogic === logic
                              ? "bg-primary text-primary-foreground"
                              : "bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {logic}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {conditionGroups.map((group, idx) => (
                  <div key={group.id} className="rounded-md border p-3 bg-card/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                        Group {idx + 1}
                      </span>
                      {conditionGroups.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeGroup(idx)}
                          className="h-5 w-5 text-destructive hover:text-destructive"
                        >
                          <Trash2Icon className="size-3" />
                        </Button>
                      )}
                    </div>
                    <ConditionGroupEditor
                      group={group}
                      depth={0}
                      onChange={(updated) => updateGroup(idx, updated)}
                    />
                  </div>
                ))}
              </div>

              <Button variant="outline" size="sm" onClick={addGroup} className="h-7 text-xs gap-1">
                <PlusIcon className="size-3" /> Add group
              </Button>
            </div>

            <Separator />

            {/* ── Options ── */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Options
              </Label>
              <div className="space-y-3">
                {operation === "FILTER_ARRAY" && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs">Stop if no results</Label>
                        <p className="text-[10px] text-muted-foreground">Throw error if filter returns 0 items</p>
                      </div>
                      <Switch checked={stopOnEmpty} onCheckedChange={setStopOnEmpty} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs">Include item metadata</Label>
                        <p className="text-[10px] text-muted-foreground">Add _filterMeta to each item</p>
                      </div>
                      <Switch checked={includeMetadata} onCheckedChange={setIncludeMetadata} />
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Continue on fail</Label>
                    <p className="text-[10px] text-muted-foreground">Return empty result instead of failing</p>
                  </div>
                  <Switch checked={continueOnFail} onCheckedChange={setContinueOnFail} />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Output Variables ── */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Output Variables
              </Label>
              <div className="rounded-md bg-muted/40 p-3 space-y-1">
                {outputHints.map((hint) => (
                  <code key={hint} className="block text-[10px] text-muted-foreground font-mono">
                    {hint}
                  </code>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
