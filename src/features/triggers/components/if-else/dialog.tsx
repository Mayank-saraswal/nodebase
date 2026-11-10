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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckIcon, Loader2Icon } from "lucide-react"
import { IfElseOperator } from "./types"
import { OPERATORS } from "./operators"
import type { ConditionsConfig } from "./evaluate-conditions"
import { ConditionsBuilder, createDefaultConfig, isCompoundConfigured } from "./conditions-builder"

interface IfElseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeId: string
  workflowId: string
}

const OPERATORS_WITHOUT_VALUE: IfElseOperator[] = [
  IfElseOperator.IS_EMPTY,
  IfElseOperator.IS_NOT_EMPTY,
  IfElseOperator.IS_TRUE,
  IfElseOperator.IS_FALSE,
]

const operatorLabel: Record<IfElseOperator, string> = {
  [IfElseOperator.EQUALS]: "equals",
  [IfElseOperator.NOT_EQUALS]: "not equals",
  [IfElseOperator.CONTAINS]: "contains",
  [IfElseOperator.NOT_CONTAINS]: "does not contain",
  [IfElseOperator.STARTS_WITH]: "starts with",
  [IfElseOperator.ENDS_WITH]: "ends with",
  [IfElseOperator.GREATER_THAN]: "greater than",
  [IfElseOperator.LESS_THAN]: "less than",
  [IfElseOperator.GREATER_THAN_OR_EQUAL]: "greater than or equal",
  [IfElseOperator.LESS_THAN_OR_EQUAL]: "less than or equal",
  [IfElseOperator.IS_EMPTY]: "is empty",
  [IfElseOperator.IS_NOT_EMPTY]: "is not empty",
  [IfElseOperator.IS_TRUE]: "is true",
  [IfElseOperator.IS_FALSE]: "is false",
  [IfElseOperator.REGEX_MATCH]: "matches regex",
}

export const IfElseDialog = ({
  open,
  onOpenChange,
  nodeId,
  workflowId,
}: IfElseDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  // Legacy single-condition state
  const [field, setField] = useState("")
  const [operator, setOperator] = useState<IfElseOperator>(
    IfElseOperator.EQUALS
  )
  const [value, setValue] = useState("")
  const [saved, setSaved] = useState(false)
  const [regexError, setRegexError] = useState<string | null>(null)

  // Compound conditions state
  const [useCompound, setUseCompound] = useState(false)
  const [conditionsConfig, setConditionsConfig] = useState<ConditionsConfig>(createDefaultConfig)

  const config = undefined as any;
  const isLoading = false;
// Pre-fill form when config loads
  useEffect(() => {
    if (config) {
      setField(config.field)
      setOperator(config.operator)
      setValue(config.value)

      if (config.conditionsJson && config.conditionsJson.trim() !== "") {
        try {
          const parsed = JSON.parse(config.conditionsJson) as ConditionsConfig
          if (parsed.combinator && Array.isArray(parsed.groups)) {
            setConditionsConfig(parsed)
            setUseCompound(true)
          } else {
            setConditionsConfig(createDefaultConfig())
            setUseCompound(false)
          }
        } catch {
          // Invalid JSON, stay in legacy mode
          setConditionsConfig(createDefaultConfig())
          setUseCompound(false)
        }
      } else {
        // No compound config — reset to legacy mode
        setConditionsConfig(createDefaultConfig())
        setUseCompound(false)
      }
    } else {
      // No config at all — reset everything
      setField("")
      setOperator(IfElseOperator.EQUALS)
      setValue("")
      setConditionsConfig(createDefaultConfig())
      setUseCompound(false)
    }
  }, [config])

  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;
const handleSave = () => {
    if (useCompound) {
      upsertMutation.mutate({
        workflowId,
        nodeId,
        field: "",
        operator: IfElseOperator.EQUALS,
        value: "",
        conditionsJson: JSON.stringify(conditionsConfig),
      })
    } else {
      // Validate regex pattern before saving
      if (operator === IfElseOperator.REGEX_MATCH && value) {
        try {
          new RegExp(value)
          setRegexError(null)
        } catch {
          setRegexError("Invalid regex pattern")
          return
        }
      }
      upsertMutation.mutate({
        workflowId,
        nodeId,
        field,
        operator,
        value: OPERATORS_WITHOUT_VALUE.includes(operator) ? "" : value,
        conditionsJson: "",
      })
    }
  }

  const showValue = !OPERATORS_WITHOUT_VALUE.includes(operator)

  const NUMERIC_OPERATORS: IfElseOperator[] = [
    IfElseOperator.GREATER_THAN,
    IfElseOperator.LESS_THAN,
    IfElseOperator.GREATER_THAN_OR_EQUAL,
    IfElseOperator.LESS_THAN_OR_EQUAL,
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>If / Else Condition</DialogTitle>
          <DialogDescription>
            Configure conditions to branch workflow execution
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Mode toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={useCompound ? "outline" : "default"}
                size="sm"
                onClick={() => setUseCompound(false)}
              >
                Simple
              </Button>
              <Button
                variant={useCompound ? "default" : "outline"}
                size="sm"
                onClick={() => setUseCompound(true)}
              >
                Advanced (AND/OR Groups)
              </Button>
            </div>

            {!useCompound ? (
              /* ──────── LEGACY SINGLE-CONDITION UI ──────── */
              <>
                {/* Section 1 — Field Input */}
                <div className="space-y-2">
                  <Label htmlFor="if-else-field">Field</Label>
                  <p className="text-xs text-muted-foreground">
                    Use dot notation to access nested data. e.g.{" "}
                    <code className="bg-muted px-1 py-0.5 rounded">
                      body.user.email
                    </code>{" "}
                    or{" "}
                    <code className="bg-muted px-1 py-0.5 rounded">
                      output.score
                    </code>
                  </p>
                  <Input
                    id="if-else-field"
                    placeholder="body.status"
                    className="font-mono"
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground/60">
                    Available: body.* headers.* queryParams.* output.*
                  </p>
                </div>

                {/* Section 2 — Operator Select */}
                <div className="space-y-2">
                  <Label htmlFor="if-else-operator">Operator</Label>
                  <Select
                    value={operator}
                    onValueChange={(val) => setOperator(val as IfElseOperator)}
                  >
                    <SelectTrigger id="if-else-operator">
                      <SelectValue placeholder="Select operator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>String</SelectLabel>
                        <SelectItem value={IfElseOperator.EQUALS}>
                          equals
                        </SelectItem>
                        <SelectItem value={IfElseOperator.NOT_EQUALS}>
                          not equals
                        </SelectItem>
                        <SelectItem value={IfElseOperator.CONTAINS}>
                          contains
                        </SelectItem>
                        <SelectItem value={IfElseOperator.NOT_CONTAINS}>
                          does not contain
                        </SelectItem>
                        <SelectItem value={IfElseOperator.STARTS_WITH}>
                          starts with
                        </SelectItem>
                        <SelectItem value={IfElseOperator.ENDS_WITH}>
                          ends with
                        </SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Number</SelectLabel>
                        <SelectItem value={IfElseOperator.GREATER_THAN}>
                          greater than
                        </SelectItem>
                        <SelectItem value={IfElseOperator.LESS_THAN}>
                          less than
                        </SelectItem>
                        <SelectItem value={IfElseOperator.GREATER_THAN_OR_EQUAL}>
                          greater than or equal
                        </SelectItem>
                        <SelectItem value={IfElseOperator.LESS_THAN_OR_EQUAL}>
                          less than or equal
                        </SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Boolean</SelectLabel>
                        <SelectItem value={IfElseOperator.IS_TRUE}>
                          is true
                        </SelectItem>
                        <SelectItem value={IfElseOperator.IS_FALSE}>
                          is false
                        </SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Empty check</SelectLabel>
                        <SelectItem value={IfElseOperator.IS_EMPTY}>
                          is empty
                        </SelectItem>
                        <SelectItem value={IfElseOperator.IS_NOT_EMPTY}>
                          is not empty
                        </SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Advanced</SelectLabel>
                        <SelectItem value={IfElseOperator.REGEX_MATCH}>
                          matches regex
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* Section 3 — Value Input */}
                {showValue && (
                  <div className="space-y-2">
                    <Label htmlFor="if-else-value">Value</Label>
                    {operator === IfElseOperator.REGEX_MATCH && (
                      <p className="text-xs text-muted-foreground">
                        Enter a valid JavaScript regex pattern e.g.{" "}
                        <code className="bg-muted px-1 py-0.5 rounded">
                          {"^[A-Z]+"}
                        </code>
                      </p>
                    )}
                    {NUMERIC_OPERATORS.includes(operator) && (
                      <p className="text-xs text-muted-foreground">
                        Enter a number
                      </p>
                    )}
                    <Input
                      id="if-else-value"
                      placeholder="Enter value..."
                      value={value}
                      onChange={(e) => {
                        setValue(e.target.value)
                        if (regexError) setRegexError(null)
                      }}
                    />
                    {regexError && (
                      <p className="text-xs text-destructive">{regexError}</p>
                    )}
                  </div>
                )}

                {/* Section 4 — Live Preview Panel */}
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <h4 className="text-sm font-medium">Preview</h4>
                  <p className="text-sm font-mono">
                    <span className="text-muted-foreground">IF </span>
                    <span className="text-foreground font-semibold">
                      {field || "field"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {operatorLabel[operator]}
                    </span>{" "}
                    {showValue && (
                      <span className="text-foreground">
                        &quot;{value}&quot;
                      </span>
                    )}
                  </p>
                  <div className="flex flex-col gap-1 mt-2">
                    <p className="text-xs">
                      →{" "}
                      <span className="font-medium text-emerald-500">TRUE</span>{" "}
                      path will execute
                    </p>
                    <p className="text-xs">
                      →{" "}
                      <span className="font-medium text-red-500">FALSE</span> path
                      will execute
                    </p>
                  </div>
                </div>
              </>
            ) : (
              /* ──────── COMPOUND CONDITIONS UI ──────── */
              <>
                <ConditionsBuilder
                  value={JSON.stringify(conditionsConfig)}
                  onChange={(json) => {
                    try {
                      const parsed = JSON.parse(json) as ConditionsConfig
                      setConditionsConfig(parsed)
                    } catch {
                      // ignore invalid JSON
                    }
                  }}
                />

                {/* Preview for compound */}
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <h4 className="text-sm font-medium">Preview</h4>
                  <div className="text-xs font-mono space-y-1">
                    {conditionsConfig.groups.map((group, gi) => (
                      <div key={gi}>
                        {gi > 0 && (
                          <span className="text-amber-500 font-semibold">
                            {conditionsConfig.combinator}{" "}
                          </span>
                        )}
                        <span className="text-muted-foreground">(</span>
                        {group.conditions.map((c, ci) => {
                          const opDef = OPERATORS.find((o) => o.value === c.operator)
                          const needsRight = !opDef || opDef.requiresRightValue
                          return (
                            <span key={c.id}>
                              {ci > 0 && (
                                <span className="text-blue-500 font-semibold">
                                  {" "}{group.combinator}{" "}
                                </span>
                              )}
                              <span className="text-foreground">
                                {c.leftValue || "?"} {opDef?.label ?? c.operator}
                                {needsRight ? ` "${c.rightValue}"` : ""}
                              </span>
                            </span>
                          )
                        })}
                        <span className="text-muted-foreground">)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Save Button */}
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={
                (!useCompound && !field.trim()) ||
                (useCompound && !isCompoundConfigured(conditionsConfig)) ||
                upsertMutation.isPending
              }
            >
              {upsertMutation.isPending ? (
                <>
                  <Loader2Icon className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <CheckIcon className="size-4 mr-2" />
                  Saved
                </>
              ) : (
                "Save Condition"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
