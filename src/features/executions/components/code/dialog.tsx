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
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckIcon, Loader2Icon } from "lucide-react"
import Editor from "@monaco-editor/react"
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

const STARTER_TEMPLATES: Record<string, { label: string; code: string }> = {
  blank: {
    label: "Blank",
    code: `// Write your code here
// $input, $json — all data from previous nodes
// $ — helper object with fetch, date, number, string, array, json utilities

return {
  // your output here
}`,
  },
  transform: {
    label: "Transform data",
    code: `// Transform incoming data
const data = $input

return {
  name: data.name?.toUpperCase(),
  email: data.email?.toLowerCase(),
  processed: true,
  processedAt: $.date.now(),
}`,
  },
  fetch: {
    label: "Fetch API data",
    code: `// Fetch data from an API (add domain to Allowed Domains)
const data = await $.getJson("https://api.example.com/data")

return {
  apiData: data,
  fetchedAt: $.date.now(),
}`,
  },
  filter: {
    label: "Filter & map array",
    code: `// Filter and transform an array
const items = $input.items ?? []

const filtered = items
  .filter(item => item.active)
  .map(item => ({
    id: item.id,
    name: item.name,
    slug: $.string.slugify(item.name),
  }))

return { filtered, count: filtered.length }`,
  },
  aggregate: {
    label: "Aggregate numbers",
    code: `// Aggregate numeric data
const items = $input.items ?? []
const amounts = items.map(i => i.amount)

return {
  total: $.number.sum(amounts),
  average: $.number.average(amounts),
  formatted: $.number.formatCurrency($.number.sum(amounts)),
  count: items.length,
}`,
  },
}

const DEFAULT_CODE = STARTER_TEMPLATES.blank.code

interface CodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (code: string) => void
  nodeId?: string
  workflowId?: string
}

export const CodeDialog = ({
  open,
  onOpenChange,
  onSubmit,
  nodeId,
  workflowId,
}: CodeDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [code, setCode] = useState(DEFAULT_CODE)
  const [language, setLanguage] = useState("javascript")
  const [outputMode, setOutputMode] = useState<"append" | "replace" | "raw">("append")
  const [timeoutMs, setTimeoutMs] = useState(5000)
  const [continueOnFail, setContinueOnFail] = useState(false)
  const [allowedDomains, setAllowedDomains] = useState("")
  const [variableName, setVariableName] = useState("codeOutput")
  const [saved, setSaved] = useState(false)

  const config = undefined as any;
const isLoading = false;

// Pre-fill from DB config when loaded
  useEffect(() => {
    if (config) {
      if (config.code) setCode(config.code)
      if (config.language) setLanguage(config.language)
      if (config.outputMode) setOutputMode(config.outputMode as "append" | "replace" | "raw")
      if (config.timeout) setTimeoutMs(config.timeout)
      setContinueOnFail(config.continueOnFail ?? false)
      if (config.allowedDomains !== undefined) setAllowedDomains(config.allowedDomains)
      if (config.variableName) setVariableName(config.variableName)
    }
  }, [config])

  // Reset when dialog opens with no config
  useEffect(() => {
    if (open && !config) {
      setCode(DEFAULT_CODE)
      setLanguage("javascript")
      setOutputMode("append")
      setTimeoutMs(5000)
      setContinueOnFail(false)
      setAllowedDomains("")
      setVariableName("codeOutput")
    }
  }, [open, config])

  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const handleSave = () => {
    onSubmit(code)

    if (workflowId && nodeId) {
      upsertMutation.mutate({
        workflowId,
        nodeId,
        code,
        language,
        outputMode,
        timeout: timeoutMs,
        continueOnFail,
        allowedDomains,
        variableName,
      })
    }
  }

  const handleTemplateSelect = (key: string) => {
    const template = STARTER_TEMPLATES[key]
    if (template) {
      setCode(template.code)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Code</DialogTitle>
          <DialogDescription>
            Write JavaScript to transform your data. Supports async/await,
            fetch(), and the $ helper API.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Settings row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Output Mode</Label>
                <Select value={outputMode} onValueChange={(v) => setOutputMode(v as "append" | "replace" | "raw")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="append">Append to context</SelectItem>
                    <SelectItem value="replace">Replace context</SelectItem>
                    <SelectItem value="raw">Raw output</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Timeout (ms)</Label>
                <Input
                  type="number"
                  min={100}
                  max={30000}
                  step={100}
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Starter Template</Label>
                <Select onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STARTER_TEMPLATES).map(([key, tmpl]) => (
                      <SelectItem key={key} value={key}>
                        {tmpl.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Code editor */}
            <div className="rounded-md border overflow-hidden">
              <Editor
                height="300px"
                defaultLanguage={language === "typescript" ? "typescript" : "javascript"}
                language={language === "typescript" ? "typescript" : "javascript"}
                value={code}
                onChange={(val) => setCode(val ?? "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                }}
              />
            </div>

            {/* Variable hints — updated for $ API */}
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Available APIs:
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground font-mono">
                <span>$input.* / $json.*</span>
                <span>$.get(key) / $.all()</span>
                <span>$.fetch(url) / $.getJson(url)</span>
                <span>$.postJson(url, body)</span>
                <span>$.date.now() / $.date.addDays()</span>
                <span>$.number.sum() / $.number.formatCurrency()</span>
                <span>$.string.slugify() / $.string.truncate()</span>
                <span>$.array.groupBy() / $.array.chunk()</span>
                <span>$.json.pick() / $.json.omit()</span>
                <span>$.log(...args)</span>
              </div>
            </div>

            {/* Advanced settings */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Variable Name</Label>
                <Input
                  value={variableName}
                  onChange={(e) => setVariableName(e.target.value)}
                  placeholder="codeOutput"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Allowed Domains (comma-separated)</Label>
                <Input
                  value={allowedDomains}
                  onChange={(e) => setAllowedDomains(e.target.value)}
                  placeholder="e.g. api.example.com, cdn.example.com"
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex items-end gap-2 pb-0.5">
                <Switch
                  id="continueOnFail"
                  checked={continueOnFail}
                  onCheckedChange={setContinueOnFail}
                />
                <Label htmlFor="continueOnFail" className="text-xs">
                  Continue on fail
                </Label>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
