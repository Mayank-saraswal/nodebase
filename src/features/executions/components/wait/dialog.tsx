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

interface WaitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: WaitConfig) => void
  nodeId?: string
  workflowId?: string
}

export interface WaitConfig {
  waitMode: "duration" | "until" | "webhook"
  duration: number
  durationUnit: "seconds" | "minutes" | "hours" | "days" | "weeks"
  untilDatetime: string
  timezone: string
  timeoutDuration: number
  timeoutUnit: "seconds" | "minutes" | "hours" | "days" | "weeks"
  continueOnTimeout: boolean
  variableName: string
}

const DURATION_UNITS = [
  { value: "seconds", label: "Seconds" },
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
]

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "US Eastern" },
  { value: "America/Chicago", label: "US Central" },
  { value: "America/Denver", label: "US Mountain" },
  { value: "America/Los_Angeles", label: "US Pacific" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Asia/Kolkata", label: "IST (India)" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Australia/Sydney", label: "Sydney" },
]

const DEFAULT_CONFIG: WaitConfig = {
  waitMode: "duration",
  duration: 30,
  durationUnit: "minutes",
  untilDatetime: "",
  timezone: "UTC",
  timeoutDuration: 24,
  timeoutUnit: "hours",
  continueOnTimeout: true,
  variableName: "wait",
}

export const WaitDialog = ({
  open,
  onOpenChange,
  onSubmit,
  nodeId,
  workflowId,
}: WaitDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [config, setConfig] = useState<WaitConfig>(DEFAULT_CONFIG)
  const [saved, setSaved] = useState(false)

  const dbConfig = undefined as any;
const isLoading = false;

useEffect(() => {
    if (dbConfig) {
      setConfig({
        waitMode: dbConfig.waitMode as WaitConfig["waitMode"],
        duration: dbConfig.duration,
        durationUnit: dbConfig.durationUnit as WaitConfig["durationUnit"],
        untilDatetime: dbConfig.untilDatetime,
        timezone: dbConfig.timezone,
        timeoutDuration: dbConfig.timeoutDuration,
        timeoutUnit: dbConfig.timeoutUnit as WaitConfig["timeoutUnit"],
        continueOnTimeout: dbConfig.continueOnTimeout,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Wait / Delay</DialogTitle>
          <DialogDescription>
            Pause workflow execution and resume after a delay, at a specific
            time, or when an external webhook fires.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Wait Mode Selector */}
            <div className="space-y-2">
              <Label>Resume Mode</Label>
              <Select
                value={config.waitMode}
                onValueChange={(v) =>
                  setConfig((c) => ({
                    ...c,
                    waitMode: v as WaitConfig["waitMode"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="duration">
                    Wait for duration
                  </SelectItem>
                  <SelectItem value="until">
                    Wait until date/time
                  </SelectItem>
                  <SelectItem value="webhook">
                    Wait for webhook
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration Mode */}
            {config.waitMode === "duration" && (
              <div className="space-y-3">
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-2">
                    <Label>Duration</Label>
                    <Input
                      type="number"
                      min={1}
                      value={config.duration}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          duration: parseInt(e.target.value) || 1,
                        }))
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={config.durationUnit}
                      onValueChange={(v) =>
                        setConfig((c) => ({ ...c, durationUnit: v as WaitConfig["durationUnit"] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_UNITS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Workflow will pause for {config.duration} {config.durationUnit},
                    then continue from this point.
                  </p>
                </div>
              </div>
            )}

            {/* Until Mode */}
            {config.waitMode === "until" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Date/Time (ISO 8601 or template)</Label>
                  <Input
                    placeholder="2025-12-31T23:59:59Z or {{body.scheduledAt}}"
                    value={config.untilDatetime}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        untilDatetime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={config.timezone}
                    onValueChange={(v) =>
                      setConfig((c) => ({ ...c, timezone: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Workflow will pause until the specified date/time, then
                    continue. Use {"{{variable}}"} to reference data from
                    previous nodes.
                  </p>
                </div>
              </div>
            )}

            {/* Webhook Mode */}
            {config.waitMode === "webhook" && (
              <div className="space-y-3">
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-2">
                    <Label>Timeout</Label>
                    <Input
                      type="number"
                      min={1}
                      value={config.timeoutDuration}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          timeoutDuration: parseInt(e.target.value) || 1,
                        }))
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={config.timeoutUnit}
                      onValueChange={(v) =>
                        setConfig((c) => ({ ...c, timeoutUnit: v as WaitConfig["timeoutUnit"] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_UNITS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={config.continueOnTimeout}
                    onCheckedChange={(v) =>
                      setConfig((c) => ({ ...c, continueOnTimeout: v }))
                    }
                  />
                  <Label className="font-normal">
                    Continue on timeout
                  </Label>
                </div>
                <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    A unique resume URL will be generated when this node
                    executes. An external system can POST to that URL to
                    resume the workflow.
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {config.continueOnTimeout
                      ? "If no webhook fires, the workflow will continue after the timeout with resumedBy: \"timeout\"."
                      : "If no webhook fires, the workflow will fail after the timeout."}
                  </p>
                </div>
              </div>
            )}

            {/* Variable Name */}
            <div className="space-y-2">
              <Label>Output Variable Name</Label>
              <Input
                placeholder="wait"
                className="font-mono text-sm"
                value={config.variableName}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, variableName: e.target.value }))
                }
              />
              <p className="text-[10px] text-muted-foreground">
                Access output as {"{{" + config.variableName + ".waitedMs}}"},{" "}
                {"{{" + config.variableName + ".resumedBy}}"}
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
