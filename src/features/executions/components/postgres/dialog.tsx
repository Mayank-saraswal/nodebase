"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import type { PostgresOperation } from "./types"
import { Loader2 } from "lucide-react"

interface PostgresDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: Record<string, unknown>) => void
  defaultValues?: Record<string, unknown>
  nodeId: string
  workflowId: string
}

interface PostgresFormValues {
  operation: string
  credentialId: string
  variableName: string
  schemaName: string
  tableName: string
  query: string
  queryParams: string
  selectColumns: string
  whereConditions: string
  insertData: string
  updateData: string
  continueOnFail: boolean
  returnData: boolean
  limitRows: number
  offsetRows: number
  allowFullTableUpdate: boolean
}

const OPERATIONS: Record<PostgresOperation, string> = {
  EXECUTE_QUERY: "Execute Raw Query",
  SELECT: "Select/Find Rows",
  SELECT_ONE: "Select One Row",
  COUNT: "Count Rows",
  EXISTS: "Check Exists",
  INSERT: "Insert Row",
  INSERT_MANY: "Insert Multiple",
  UPDATE: "Update Rows",
  DELETE: "Delete Rows",
  UPSERT: "Upsert Row(s)",
  EXECUTE_TRANSACTION: "Execute Transaction",
  GET_TABLE_SCHEMA: "Get Table Schema",
  LIST_TABLES: "List Tables",
  LIST_SCHEMAS: "List Schemas",
  CREATE_TABLE: "Create Table",
  DROP_TABLE: "Drop Table",
  EXECUTE_FUNCTION: "Execute DB Function",
  
  EXECUTE_EXPLAIN: "Explain Query Plan",
  FULL_TEXT_SEARCH: "Full Text Search",
  JSON_PATH_QUERY: "JSON Path Query",
  JSON_SET_FIELD: "JSON Set Field",
  JSON_AGGREGATE: "JSON Aggregate",
}

export function PostgresDialog({ open, onOpenChange, onSubmit, defaultValues, nodeId, workflowId }: PostgresDialogProps) {
  const trpc = useTRPC()

  const dbConfig = undefined as any;

const { data: pgCredentials = [] } = useQuery(
    trpc.credentials.getByType.queryOptions({ type: "POSTGRES" })
  )

  const testConnectionMutation = useMutation(trpc.credentials.testPostgresConnection.mutationOptions())
  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const merged = { ...defaultValues, ...dbConfig } as Record<string, unknown>

  const form = useForm<PostgresFormValues>({
    defaultValues: {
      operation: (merged.operation as string) ?? "EXECUTE_QUERY",
      credentialId: (merged.credentialId as string) ?? "",
      variableName: (merged.variableName as string) ?? "postgres",
      schemaName: (merged.schemaName as string) ?? "public",
      tableName: (merged.tableName as string) ?? "",
      query: (merged.query as string) ?? "",
      queryParams: (merged.queryParams as string) ?? "[]",
      selectColumns: (merged.selectColumns as string) ?? "[]",
      whereConditions: (merged.whereConditions as string) ?? "[]",
      insertData: (merged.insertData as string) ?? "",
      updateData: (merged.updateData as string) ?? "",
      continueOnFail: (merged.continueOnFail as boolean) ?? false,
      returnData: (merged.returnData as boolean) ?? true,
      limitRows: (merged.limitRows as number) ?? 0,
      offsetRows: (merged.offsetRows as number) ?? 0,
      allowFullTableUpdate: (merged.allowFullTableUpdate as boolean) ?? false,
    }
  })

  useEffect(() => {
    if (dbConfig) {
      form.reset({
        ...defaultValues,
        ...dbConfig,
      } as unknown as PostgresFormValues)
    }
  }, [dbConfig, defaultValues, form])

  const { register, watch, setValue, handleSubmit, formState: { isSubmitting } } = form
  const operation = watch("operation") as PostgresOperation
  const credentialId = watch("credentialId")

  const [testResult, setTestResult] = useState<{ success: boolean; ms?: number; err?: string } | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const handleTestConnection = async () => {
    if (!credentialId) {
      toast.error("Please select a Postgres credential first.")
      return
    }
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = await testConnectionMutation.mutateAsync({ credentialId })
      setTestResult({ success: true, ms: res.latencyMs })
      toast.success("Connection successful!")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect"
      setTestResult({ success: false, err: message })
      toast.error("Connection failed")
    } finally {
      setIsTesting(false)
    }
  }

  const onFormSubmit = async (values: PostgresFormValues) => {
    try {
      const payload = {
        nodeId,
        workflowId,
        operation: values.operation as PostgresOperation,
        credentialId: values.credentialId || null,
        tableName: values.tableName,
        schemaName: values.schemaName,
        variableName: values.variableName,
        query: values.query,
        queryParams: values.queryParams,
        selectColumns: values.selectColumns || "[]",
        whereConditions: values.whereConditions || "[]",
        insertData: values.insertData,
        updateData: values.updateData,
        limitRows: Number(values.limitRows),
        offsetRows: Number(values.offsetRows),
        returnData: values.returnData,
        continueOnFail: values.continueOnFail,
        allowFullTableUpdate: values.allowFullTableUpdate,
      }
      await upsertMutation.mutateAsync(payload)
      onSubmit(payload)
      toast.success("Postgres node saved")
      onOpenChange(false)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error"
      toast.error(`Failed to save: ${message}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>PostgreSQL Engine</DialogTitle>
          <DialogDescription>
            High-performance structured data execution node.
          </DialogDescription>
        </DialogHeader>

        <form id="postgres-form" onSubmit={handleSubmit(onFormSubmit)} className="flex-1 overflow-y-auto pr-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Credential</Label>
              <div className="flex items-center gap-2">
                <Select value={credentialId} onValueChange={(v) => setValue("credentialId", v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select Database..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pgCredentials.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="secondary" onClick={handleTestConnection} disabled={isTesting || !credentialId}>
                  {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                </Button>
              </div>
              {testResult && (
                <p className={`text-xs ${testResult.success ? "text-green-600" : "text-red-500"}`}>
                  {testResult.success ? `Connected in ${testResult.ms}ms` : testResult.err}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Operation</Label>
              <Select value={operation} onValueChange={(v) => setValue("operation", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.entries(OPERATIONS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="query" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="query">Query Builder</TabsTrigger>
              <TabsTrigger value="settings">Advanced Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="query" className="space-y-4 pt-4">
              {operation === "EXECUTE_QUERY" || operation === "EXECUTE_EXPLAIN" ? (
                <>
                  <div className="space-y-2">
                    <Label>SQL Query (use $1, $2 for params)</Label>
                    <Textarea className="font-mono text-sm h-32" placeholder="SELECT * FROM users WHERE active = $1" {...register("query")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Query Parameters (JSON Array)</Label>
                    <Input className="font-mono" placeholder="[10, true, {{user.id}}]" {...register("queryParams")} />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Schema Name</Label>
                      <Input placeholder="public" {...register("schemaName")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Table Name</Label>
                      <Input placeholder="users" {...register("tableName")} />
                    </div>
                  </div>
                  
                  {["SELECT", "SELECT_ONE", "UPDATE", "DELETE", "COUNT", "EXISTS"].includes(operation) && (
                    <div className="space-y-2">
                      <Label>Where Conditions (JSON Array)</Label>
                      <Textarea 
                        className="font-mono h-24 text-xs" 
                        placeholder={'[ {"column": "id", "operator": "=", "value": "{{request.id}}", "logic": "AND"} ]'} 
                        {...register("whereConditions")} 
                      />
                    </div>
                  )}

                  {["INSERT", "UPSERT"].includes(operation) && (
                    <div className="space-y-2">
                      <Label>Insert Data (JSON Object)</Label>
                      <Textarea 
                        className="font-mono h-24 text-xs" 
                        placeholder={'{"name": "Alice", "email": "alice@example.com"}'} 
                        {...register("insertData")} 
                      />
                    </div>
                  )}

                  {operation === "UPDATE" && (
                    <div className="space-y-2">
                      <Label>Update Data (JSON Object)</Label>
                      <Textarea 
                        className="font-mono h-24 text-xs" 
                        placeholder={'{"status": "active"}'} 
                        {...register("updateData")} 
                      />
                    </div>
                  )}
                  
                  {operation === "SELECT" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Limit</Label>
                        <Input type="number" {...register("limitRows")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Offset</Label>
                        <Input type="number" {...register("offsetRows")} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Output Variable Name</Label>
                  <Input {...register("variableName")} placeholder="postgres" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Return Data</Label>
                    <p className="text-xs text-muted-foreground">Append RETURNING * to queries to get modified rows.</p>
                  </div>
                  <Switch checked={watch("returnData")} onCheckedChange={(v) => setValue("returnData", v)} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Continue on Fail</Label>
                    <p className="text-xs text-muted-foreground">Catch errors and output them instead of terminating the workflow.</p>
                  </div>
                  <Switch checked={watch("continueOnFail")} onCheckedChange={(v) => setValue("continueOnFail", v)} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Full Table Update</Label>
                    <p className="text-xs text-muted-foreground">Allow UPDATE operation without WHERE conditions.</p>
                  </div>
                  <Switch checked={watch("allowFullTableUpdate")} onCheckedChange={(v) => setValue("allowFullTableUpdate", v)} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </form>

        <div className="shrink-0 flex justify-end gap-2 pt-4 mt-6 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="postgres-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
